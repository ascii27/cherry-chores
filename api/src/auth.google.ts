import express, { Router, Request } from 'express';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { JwtService } from './auth';
import { FamiliesRepository, UsersRepository } from './repositories';

export function configureGoogleAuth(app: express.Express, opts: { users: UsersRepository; families: FamiliesRepository; jwt: JwtService }) {
  const { users, families, jwt } = opts;
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback';
  if (!clientID || !clientSecret) return; // not configured

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done: (err: any, user?: any) => void) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || profile.name?.givenName || 'Parent';
          if (!email) return done(null, false);
          let parent = await users.getParentByEmail(email);
          if (!parent) {
            parent = await users.upsertParent({ id: profile.id, email, name, families: [] });
          }
          return done(null, { id: parent.id, email: parent.email, name: parent.name });
        } catch (e) {
          return done(e as any);
        }
      }
    )
  );

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'session-secret',
      resave: false,
      saveUninitialized: false
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user: any, done: (err: any, id?: any) => void) => done(null, user));
  passport.deserializeUser((obj: any, done: (err: any, user?: any) => void) => done(null, obj as any));

  const router = Router();
  router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

  router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    async (req: Request, res) => {
      const user = (req as any).user as { id: string; email: string; name: string };
      const token = jwt.sign({ sub: user.id, role: 'parent' });
      const redirectUrl = process.env.POST_LOGIN_REDIRECT_URL || '/parent';
      const redirectTo = `${redirectUrl}#token=${token}`;
      let allowedOrigin = 'http://localhost:3000';
      try {
        allowedOrigin = new URL(redirectUrl, 'http://localhost').origin;
      } catch {}
      if ((req.query as any)?.mode === 'popup') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html><head><meta charset="utf-8" /></head><body><script>
          (function(){
            var token = ${JSON.stringify(token)};
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'google-auth', token: token }, ${JSON.stringify(allowedOrigin)});
                window.close();
                return;
              }
            } catch (e) {}
            window.location = ${JSON.stringify(redirectTo)};
          })();
        </script></body></html>`);
        return;
      }
      res.redirect(redirectTo);
    }
  );

  app.use(router);

  // OAuth code exchange for GIS code client popup flow
  router.post('/auth/google/code', async (req, res) => {
    try {
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ error: 'missing code' });
      if (!clientID || !clientSecret) return res.status(500).json({ error: 'google not configured' });
      const params = new URLSearchParams({
        code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code'
      });
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      if (!tokenRes.ok) {
        const txt = await tokenRes.text();
        return res.status(401).json({ error: 'token exchange failed', details: txt });
      }
      const tokenJson = await tokenRes.json() as any;
      const accessToken = tokenJson.access_token as string | undefined;
      let email = '';
      let name = '';
      if (accessToken) {
        const ui = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (ui.ok) {
          const u = await ui.json() as any;
          email = u.email;
          name = u.name || u.given_name || '';
        }
      }
      if (!email) return res.status(401).json({ error: 'no email from google' });
      let parent = await users.getParentByEmail(email);
      if (!parent) parent = await users.upsertParent({ id: `google-${email}`, email, name: name || email.split('@')[0], families: [] });
      const token = jwt.sign({ sub: parent.id, role: 'parent' });
      return res.json({ token, user: { id: parent.id, email: parent.email, name: parent.name } });
    } catch (e: any) {
      return res.status(500).json({ error: 'exchange error' });
    }
  });
}
