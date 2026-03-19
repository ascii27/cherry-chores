import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import './styles/landing.css';

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

  useEffect(() => {
    if (dialog && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [dialog]);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp-root">
      {/* Background blobs */}
      <div className="lp-blobs" aria-hidden>
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
      </div>

      {/* ── NAV ── */}
      <nav className={`lp-nav${sticky ? ' is-sticky' : ''}`} aria-label="Primary">
        <a href="#home" className="lp-brand" aria-label="Cherry Chores home">
          <img src="/icons/cherry.svg" alt="" width={32} height={32} />
          Cherry<span>Chores</span>
        </a>

        <ul className="lp-nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#features">Features</a></li>
        </ul>

        <div className="lp-nav-actions">
          <button className="lp-btn lp-btn-ghost" onClick={() => setDialog('child')}>
            I'm a Kid 🎮
          </button>
          <button className="lp-btn lp-btn-primary" style={{ fontSize: 14, padding: '10px 20px' }} onClick={() => setDialog('parent')}>
            Parent Login
          </button>
          <button
            className="lp-hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            <span /><span /><span />
          </button>
        </div>

        {menuOpen && (
          <div className="lp-mobile-menu" role="menu">
            <a href="#home" role="menuitem" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#how-it-works" role="menuitem" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#features" role="menuitem" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#" role="menuitem" onClick={(e) => { e.preventDefault(); setMenuOpen(false); setDialog('child'); }}>I'm a Kid 🎮</a>
            <a href="#" role="menuitem" onClick={(e) => { e.preventDefault(); setMenuOpen(false); setDialog('parent'); }}>Parent Login</a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="home" className="lp-hero">
        {/* Left: copy */}
        <div>
          <div className="lp-hero-eyebrow" aria-label="New">
            ✨ &nbsp;The chore app kids actually want to use
          </div>
          <h1>
            Turn chores into<br />
            <span className="cherry">epic&nbsp;</span>
            <span className="highlight">adventures</span>
          </h1>
          <p className="lp-hero-sub">
            Cherry Chores gamifies household tasks — kids earn coins, level up,
            and unlock rewards while parents stay effortlessly in control.
            Everyone wins. 🍒
          </p>
          <div className="lp-hero-cta">
            <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => setDialog('parent')}>
              Get Started Free →
            </button>
            <button className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => setDialog('child')}>
              I'm a Kid 🎮
            </button>
          </div>
          <div className="lp-hero-social-proof">
            <div className="lp-avatars" aria-hidden>
              <div className="lp-avatar">🧒</div>
              <div className="lp-avatar">👧</div>
              <div className="lp-avatar">🧑</div>
              <div className="lp-avatar">👦</div>
            </div>
            <div className="lp-social-text">
              <strong>500+ families</strong> already earning coins<br />
              <span>Join them today — it's free to start</span>
            </div>
          </div>
        </div>

        {/* Right: game card mockup */}
        <div className="lp-hero-visual">
          <span className="lp-float lp-float-1" aria-hidden>🍒</span>
          <span className="lp-float lp-float-2" aria-hidden>⭐</span>
          <span className="lp-float lp-float-3" aria-hidden>🪙</span>
          <span className="lp-float lp-float-4" aria-hidden>🎯</span>

          <div className="lp-game-card" role="img" aria-label="Cherry Chores app preview">
            {/* Header */}
            <div className="lp-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="lp-card-avatar">🧒</div>
                <div>
                  <div className="lp-card-name">Alex's Quest</div>
                  <div className="lp-card-level">⚡ Level 7 Explorer</div>
                </div>
              </div>
              <div className="lp-coin-badge">
                <span className="lp-coin-spin">🪙</span>
                340
              </div>
            </div>

            {/* XP Bar */}
            <div className="lp-xp-section">
              <div className="lp-xp-label">
                <span>XP Progress</span>
                <span>680 / 1000</span>
              </div>
              <div className="lp-xp-bar">
                <div className="lp-xp-fill" />
              </div>
            </div>

            {/* Chore list */}
            <div className="lp-chores-list">
              <div className="lp-chore-item done">
                <div className="lp-chore-check">✓</div>
                <span className="lp-chore-name">Make the bed</span>
                <span className="lp-chore-reward">🪙 +20</span>
              </div>
              <div className="lp-chore-item done">
                <div className="lp-chore-check">✓</div>
                <span className="lp-chore-name">Feed the dog</span>
                <span className="lp-chore-reward">🪙 +15</span>
              </div>
              <div className="lp-chore-item">
                <div className="lp-chore-check" />
                <span className="lp-chore-name">Tidy bedroom</span>
                <span className="lp-chore-reward">🪙 +25</span>
              </div>
              <div className="lp-chore-item">
                <div className="lp-chore-check" />
                <span className="lp-chore-name">Set the table</span>
                <span className="lp-chore-reward">🪙 +10</span>
              </div>
            </div>

            {/* Streak */}
            <div className="lp-streak-banner">
              🔥 &nbsp;<span>5-day streak! Keep it up, Alex!</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS RIBBON ── */}
      <div className="lp-stats-ribbon" aria-label="App stats">
        <div className="lp-stats-inner">
          <div className="lp-stat-item">
            <div className="lp-stat-num">10k+</div>
            <div className="lp-stat-label">🏆 Chores completed</div>
          </div>
          <div className="lp-stat-item">
            <div className="lp-stat-num">50k+</div>
            <div className="lp-stat-label">🪙 Coins earned</div>
          </div>
          <div className="lp-stat-item">
            <div className="lp-stat-num">500+</div>
            <div className="lp-stat-label">👨‍👩‍👧 Happy families</div>
          </div>
          <div className="lp-stat-item">
            <div className="lp-stat-num">98%</div>
            <div className="lp-stat-label">⭐ Parent approval</div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" aria-labelledby="how-heading">
        <div className="lp-section">
          <div className="lp-section-tag">How it works</div>
          <h2 id="how-heading" className="lp-section-h2">
            Three steps to<br />household harmony
          </h2>
          <p className="lp-section-sub">
            Up and running in minutes. No complicated setup, no subscriptions to manage — just a family that actually gets things done.
          </p>

          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num" aria-hidden>1</div>
              <div className="lp-step-icon" aria-hidden>📋</div>
              <h3>Parents set up chores</h3>
              <p>Create tasks, assign coin values, and set schedules. Takes less than two minutes. You're the boss — literally.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-num" aria-hidden>2</div>
              <div className="lp-step-icon" aria-hidden>🚀</div>
              <h3>Kids complete &amp; earn</h3>
              <p>Kids see their personal quest board, check off tasks, and watch their coin balance grow. It feels like a game — because it is one.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-num" aria-hidden>3</div>
              <div className="lp-step-icon" aria-hidden>🎉</div>
              <h3>Save, spend, celebrate</h3>
              <p>Kids save toward real goals — toys, outings, privileges. Parents approve payouts. Streaks, badges, and celebrations keep the momentum going.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <div className="lp-features-section" id="features">
        <section aria-labelledby="features-heading">
          <div className="lp-section">
            <div className="lp-section-tag">Features</div>
            <h2 id="features-heading" className="lp-section-h2">
              Everything your family needs
            </h2>
            <p className="lp-section-sub">
              Built for real families — not Silicon Valley stereotypes.
            </p>

            <div className="lp-features">
              <div className="lp-feature">
                <div className="lp-feature-icon-wrap fi-1" aria-hidden>🎮</div>
                <div>
                  <h3>Game-like experience</h3>
                  <p>Levels, streaks, XP bars, and coin animations make doing chores genuinely satisfying for kids of all ages.</p>
                </div>
              </div>
              <div className="lp-feature">
                <div className="lp-feature-icon-wrap fi-2" aria-hidden>🪙</div>
                <div>
                  <h3>Virtual coin economy</h3>
                  <p>Every completed chore earns coins. Kids allocate earnings across savings goals — learning real financial habits along the way.</p>
                </div>
              </div>
              <div className="lp-feature">
                <div className="lp-feature-icon-wrap fi-3" aria-hidden>🎯</div>
                <div>
                  <h3>Savings goals</h3>
                  <p>Set a goal, watch the progress bar fill up. From a new toy to a family trip — motivation with a visual finish line.</p>
                </div>
              </div>
              <div className="lp-feature">
                <div className="lp-feature-icon-wrap fi-4" aria-hidden>👨‍👩‍👧</div>
                <div>
                  <h3>Full parent control</h3>
                  <p>Approve completions, run weekly payouts, manage multiple kids, and customize everything — all from your own dashboard.</p>
                </div>
              </div>
              <div className="lp-feature">
                <div className="lp-feature-icon-wrap fi-5" aria-hidden>🎨</div>
                <div>
                  <h3>Personalized profiles</h3>
                  <p>Kids pick their avatar and color theme. Each child gets a unique, personal experience that feels like it's truly theirs.</p>
                </div>
              </div>
              <div className="lp-feature">
                <div className="lp-feature-icon-wrap fi-6" aria-hidden>🔥</div>
                <div>
                  <h3>Streaks &amp; celebrations</h3>
                  <p>Daily streaks, confetti explosions, and milestone badges keep the energy high all week long.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── TESTIMONIALS ── */}
      <section aria-labelledby="testimonials-heading">
        <div className="lp-section">
          <div className="lp-section-tag">Testimonials</div>
          <h2 id="testimonials-heading" className="lp-section-h2">Families love it</h2>
          <p className="lp-section-sub">Don't take our word for it.</p>

          <div className="lp-testimonials">
            <div className="lp-testimonial">
              <div className="lp-stars" aria-label="5 stars">★★★★★</div>
              <p>"My 8-year-old now asks me if there are new chores to do. I never thought those words would come out of his mouth."</p>
              <div className="lp-t-author">
                <div className="lp-t-avatar" aria-hidden>👩</div>
                <div>
                  <div className="lp-t-name">Sarah M.</div>
                  <div className="lp-t-role">Mom of 2 · Ohio</div>
                </div>
              </div>
            </div>
            <div className="lp-testimonial">
              <div className="lp-stars" aria-label="5 stars">★★★★★</div>
              <p>"The coin system is genius. Our daughter is saving for a Nintendo Switch and suddenly can't do chores fast enough. Totally transformed our household."</p>
              <div className="lp-t-author">
                <div className="lp-t-avatar" aria-hidden>👨</div>
                <div>
                  <div className="lp-t-name">James R.</div>
                  <div className="lp-t-role">Dad of 3 · Texas</div>
                </div>
              </div>
            </div>
            <div className="lp-testimonial">
              <div className="lp-stars" aria-label="5 stars">★★★★★</div>
              <p>"Setup took 5 minutes and both kids were on it that same evening. The streak feature keeps them consistent — it's been 3 weeks of zero nagging."</p>
              <div className="lp-t-author">
                <div className="lp-t-avatar" aria-hidden>👩‍🦱</div>
                <div>
                  <div className="lp-t-name">Priya K.</div>
                  <div className="lp-t-role">Mom of 2 · California</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="lp-cta-section">
        <div className="lp-cta-inner">
          <span className="lp-cta-cherries" aria-hidden>🍒</span>
          <h2>Ready to make chores<br />the best part of the day?</h2>
          <p>Join hundreds of families who've traded nagging for high-fives. Free to start, fun forever.</p>
          <div className="lp-cta-btns">
            <button className="lp-btn lp-btn-gold lp-btn-lg" onClick={() => setDialog('parent')}>
              🚀 &nbsp;Get Started Free
            </button>
            <button className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => setDialog('child')}>
              I'm a Kid 🎮
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">🍒 CherryChores</div>
        <div className="lp-footer-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
          © {new Date().getFullYear()} Cherry Chores
        </div>
      </footer>

      {/* ── DIALOGS ── */}
      {dialog && <div className="lp-overlay" onClick={() => setDialog(null)} aria-hidden />}
      {dialog && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
          <div className="lp-modal-card" onClick={e => e.stopPropagation()}>
            <button
              ref={closeBtnRef}
              className="lp-modal-close"
              onClick={() => setDialog(null)}
              aria-label="Close"
            >×</button>

            {dialog === 'parent' ? (
              <>
                <div className="lp-modal-icon" aria-hidden>👨‍👩‍👧</div>
                <h2 id={dialogTitleId}>Parent Sign In</h2>
                <p className="lp-modal-sub">Sign in with Google to manage your family, approve chores, and run weekly payouts.</p>
                <button className="lp-google-btn" aria-label="Sign in with Google" onClick={handleParentSignIn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </>
            ) : (
              <>
                <div className="lp-modal-icon" aria-hidden>🎮</div>
                <h2 id={dialogTitleId}>Kid Sign In</h2>
                <p className="lp-modal-sub">Welcome back, adventurer! Enter your username and password to continue your quest.</p>
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
                        alert('Login failed — check your username and password!');
                      }
                    } catch {
                      alert('Login failed — please try again!');
                    }
                  }}
                >
                  <div className="lp-form-group">
                    <label htmlFor="child-login-username">Username</label>
                    <input id="child-login-username" placeholder="Enter your username" autoComplete="username" />
                  </div>
                  <div className="lp-form-group">
                    <label htmlFor="child-login-password">Password</label>
                    <input id="child-login-password" type="password" placeholder="Enter your password" autoComplete="current-password" />
                  </div>
                  <button className="lp-btn lp-btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px 20px', borderRadius: 12 }}>
                    Start My Quest 🚀
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
