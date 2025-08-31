import { Router } from 'express';
import { AuthProvider, AuthTokenPayload } from '../types';
import { JwtService } from '../auth';
import { UsersRepository, FamiliesRepository } from '../repositories';

export function authRoutes(opts: {
  authProvider: AuthProvider;
  jwt: JwtService;
  users: UsersRepository;
  families: FamiliesRepository;
}) {
  const router = Router();
  const { authProvider, jwt, users, families } = opts;

  // Simulate Google OAuth callback with idToken in body
  router.post('/auth/google/callback', async (req, res) => {
    const { idToken, familyId, familyName, timezone } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'missing idToken' });

    const profile = await authProvider.verifyGoogleIdToken(idToken);
    // Upsert parent
    let parent = await users.getParentByEmail(profile.email);
    if (!parent) {
      parent = await users.upsertParent({ id: profile.sub, email: profile.email, name: profile.name, families: [] });
    }
    // Optionally create a new family on first sign-in
    let fid = familyId as string | undefined;
    if (!fid && familyName && timezone) {
      const fam = await families.createFamily({ id: `fam_${Date.now()}`, name: familyName, timezone, parentIds: [parent.id], childIds: [] });
      parent.families.push(fam.id);
      await users.upsertParent(parent);
      fid = fam.id;
    }

    const payload: AuthTokenPayload = { sub: parent.id, role: 'parent' };
    const token = jwt.sign(payload);
    return res.status(200).json({ token, user: { id: parent.id, email: parent.email, name: parent.name }, familyId: fid });
  });

  // Child login: simple username/password within a family
  router.post('/auth/child/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing fields' });
    const child = await users.getChildByUsername(username);
    if (!child || child.passwordHash !== password) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ sub: child.id, role: 'child', familyId: child.familyId } as AuthTokenPayload);
    return res.status(200).json({ token, child: { id: child.id, displayName: child.displayName, username: child.username }, familyId: child.familyId });
  });

  // Logout (clear server session if present; JWT is client-managed)
  router.post('/auth/logout', async (req, res) => {
    try {
      // @ts-ignore - express-session optional
      if (req.session) {
        // @ts-ignore
        req.session.destroy(() => res.status(204).send());
        return;
      }
    } catch {}
    res.status(204).send();
  });

  return router;
}
