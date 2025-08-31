import React, { useCallback, useState } from 'react';

export default function App() {
  const [parentToken, setParentToken] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  const handleParentSignIn = useCallback(async () => {
    const google: any = (window as any).google;
    if (!google || !google.accounts) {
      alert('Google auth library not loaded yet. Please try again.');
      return;
    }
    let clientId = googleClientId;
    if (!clientId) {
      try {
        const r = await fetch('/config/public');
        const data = await r.json();
        clientId = data.googleClientId || null;
        setGoogleClientId(clientId);
      } catch {}
    }
    if (!clientId) {
      alert('Google sign-in is not configured on the server.');
      return;
    }
    const codeClient = google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: async (resp: any) => {
        if (resp && resp.code) {
          try {
            const r = await fetch('/auth/google/code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: resp.code })
            });
            const data = await r.json();
            if (r.ok && data.token) {
              localStorage.setItem('parentToken', data.token);
              window.location.assign('/parent');
            }
          } catch {}
        }
      }
    });
    codeClient.requestCode();
  }, [googleClientId]);

  const handleCreateChild = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!parentToken) return;
    const form = e.currentTarget;
    const username = (form.querySelector('#username') as HTMLInputElement)?.value;
    const password = (form.querySelector('#password') as HTMLInputElement)?.value;
    const fam = (form.querySelector('#familyId') as HTMLInputElement)?.value || familyId;
    if (!fam) return;
    try {
      await fetch('/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${parentToken}` },
        body: JSON.stringify({ familyId: fam, username, password, displayName: username })
      });
    } catch {}
  }, [parentToken, familyId]);
  return (
    <div className="container py-5">
      <header className="mb-5 text-center">
        <h1 className="display-5 fw-bold">Cherry Chores</h1>
        <p className="lead text-muted">Fun, simple chore tracking and coins for kids.</p>
      </header>
      <main className="row g-4">
        <div className="col-12 col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4">Parent Sign In</h2>
              <p className="text-muted">Sign in with Google to manage your family.</p>
              <button className="btn btn-primary" aria-label="Parent Sign In with Google" type="button" onClick={handleParentSignIn}>
                Continue with Google
              </button>
              {parentToken && (
                <div className="mt-3 small text-success">Signed in. Family: {familyId}</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4">Child Sign In</h2>
              <form
                aria-label="Child Sign In Form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const username = (e.currentTarget.querySelector('#child-login-username') as HTMLInputElement)?.value;
                  const password = (e.currentTarget.querySelector('#child-login-password') as HTMLInputElement)?.value;
                  try {
                    const r = await fetch('/auth/child/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username, password })
                    });
                    const data = await r.json();
                    if (r.ok && data.token) {
                      localStorage.setItem('childToken', data.token);
                      window.location.assign('/child');
                    } else {
                      alert('Login failed');
                    }
                  } catch {
                    alert('Login failed');
                  }
                }}
              >
                <div className="mb-3">
                  <label htmlFor="child-login-username" className="form-label">Username</label>
                  <input id="child-login-username" className="form-control" />
                </div>
                <div className="mb-3">
                  <label htmlFor="child-login-password" className="form-label">Password</label>
                  <input id="child-login-password" type="password" className="form-control" />
                </div>
                <button className="btn btn-success" type="submit">Sign In</button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
