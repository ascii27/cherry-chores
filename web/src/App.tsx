import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

export default function App() {
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | 'parent' | 'child'>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = useId();

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

  // Focus the close button when dialog opens for accessibility
  useEffect(() => {
    if (dialog && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [dialog]);

  // Sticky top bar: add shadow when scrolled
  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div>
      {/* Top nav */}
      <div className={`topnav${sticky ? ' is-sticky' : ''}`}>
        <div className="container">
          {/* Left: brand logo + name */}
          <a href="#home" className="brand" aria-label="Cherry Chores home">
            <img src="/icons/cherry.svg" alt="" width={24} height={24} />
            Cherry Chores
          </a>

          {/* Center: nav links (desktop) */}
          <nav className="center-nav" aria-label="Primary">
            <a className="nav-link" href="#home">Home</a>
            <a className="nav-link" href="#about">About Us</a>
            <a className="nav-link" href="#courses">Courses</a>
            <a className="nav-link" href="#contact">Contact</a>
          </nav>

          {/* Right: CTA + hamburger (mobile) */}
          <div className="right-actions">
            <button className="btn btn-secondary" onClick={() => setDialog('parent')}>Set Appointment</button>
            <button
              className="menu-btn"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-primary-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span aria-hidden />
            </button>
          </div>

          {/* Mobile menu (collapses nav links) */}
          {menuOpen && (
            <div id="mobile-primary-nav" className="mobile-menu" role="menu" aria-label="Primary">
              <a href="#home" role="menuitem" onClick={() => setMenuOpen(false)}>Home</a>
              <a href="#about" role="menuitem" onClick={() => setMenuOpen(false)}>About Us</a>
              <a href="#courses" role="menuitem" onClick={() => setMenuOpen(false)}>Courses</a>
              <a href="#contact" role="menuitem" onClick={() => setMenuOpen(false)}>Contact</a>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-6">
              <h1 className="title">Make chores fun. Earn coins. Reach goals.</h1>
              <p className="subtitle mt-3">Cherry Chores turns everyday tasks into a playful game. Kids complete chores to earn coins, then save and spend toward goals—while parents manage everything with one tap.</p>
              <div className="cta-group mt-4">
                <button className="btn btn-primary btn-pill" onClick={() => setDialog('parent')} aria-label="Parent sign in">Get started as a Parent</button>
                <button className="btn btn-outline-primary btn-pill" onClick={() => setDialog('child')} aria-label="Child sign in">I'm a Kid</button>
              </div>
            </div>
            <div className="col-12 col-lg-6 d-flex justify-content-center">
              <div className="hero-illustration">
                <svg viewBox="0 0 200 160" role="img" aria-label="Chores and rewards illustration">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--primary-2)" />
                    </linearGradient>
                  </defs>
                  <rect x="10" y="20" width="80" height="50" rx="12" fill="url(#g1)" opacity="0.9" />
                  <circle cx="55" cy="45" r="10" fill="#fff" opacity="0.85" />
                  <rect x="25" y="32" width="25" height="6" rx="3" fill="#fff" opacity="0.85" />
                  <rect x="25" y="42" width="32" height="6" rx="3" fill="#fff" opacity="0.7" />

                  <rect x="110" y="40" width="80" height="50" rx="12" fill="#fff" stroke="var(--border)" />
                  <rect x="120" y="55" width="60" height="8" rx="4" fill="var(--primary)" opacity="0.2" />
                  <rect x="120" y="55" width="36" height="8" rx="4" fill="var(--primary)" />

                  <g transform="translate(20,95)">
                    <rect x="0" y="0" width="60" height="40" rx="12" fill="#fff" stroke="var(--border)" />
                    <text x="30" y="25" textAnchor="middle" fontSize="16">📋</text>
                  </g>
                  <g transform="translate(80,95)">
                    <rect x="0" y="0" width="60" height="40" rx="12" fill="#fff" stroke="var(--border)" />
                    <text x="30" y="25" textAnchor="middle" fontSize="16">💰</text>
                  </g>
                  <g transform="translate(140,95)">
                    <rect x="0" y="0" width="60" height="40" rx="12" fill="#fff" stroke="var(--border)" />
                    <text x="30" y="25" textAnchor="middle" fontSize="16">🎯</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="pb-5">
        <div className="container">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="card card--interactive h-100">
                <div className="card-body">
                  <div className="feature-icon" aria-hidden>📋</div>
                  <h3 className="h5 mt-2">Kid‑friendly chores</h3>
                  <p className="text-muted mb-0">Clear tasks and fun feedback help kids build great habits.</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card card--interactive h-100">
                <div className="card-body">
                  <div className="feature-icon" aria-hidden>💰</div>
                  <h3 className="h5 mt-2">Earn & save coins</h3>
                  <p className="text-muted mb-0">Kids earn coins for completing chores and can allocate to goals.</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card card--interactive h-100">
                <div className="card-body">
                  <div className="feature-icon" aria-hidden>🎯</div>
                  <h3 className="h5 mt-2">Reach goals</h3>
                  <p className="text-muted mb-0">Progress bars, celebrations, and simple bank summaries keep it motivating.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dialogs */}
      {dialog && <div className="cc-overlay" onClick={() => setDialog(null)} aria-hidden />}
      {dialog && (
        <div className="cc-modal" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
          <div className="cc-modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <h2 id={dialogTitleId} className="h5 mb-0">{dialog === 'parent' ? 'Parent Sign In' : 'Child Sign In'}</h2>
                <button ref={closeBtnRef} className="btn btn-sm btn-outline-secondary" onClick={() => setDialog(null)} aria-label="Close">Close</button>
              </div>
              {dialog === 'parent' ? (
                <div className="mt-3">
                  <p className="text-muted">Sign in with Google to manage your family, approve chores, and run payouts.</p>
                  <button className="btn btn-primary" aria-label="Parent Sign In with Google" type="button" onClick={handleParentSignIn}>
                    Continue with Google
                  </button>
                </div>
              ) : (
                <form
                  className="mt-3"
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
                  <button className="btn btn-primary" type="submit">Sign In</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
