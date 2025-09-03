import React from 'react';

export default function TopBar({
  name,
  avatar,
  onLogout,
  accent,
  onMenuToggle,
  onNameClick,
  profileHref
}: {
  name?: string | null;
  avatar?: string | null;
  onLogout: () => void;
  accent?: string | null;
  onMenuToggle?: () => void;
  onNameClick?: () => void;
  profileHref?: string;
}) {
  return (
    <div className="cc-topbar border-bottom" style={{ background: 'var(--surface)', borderBottomColor: 'var(--border)', ...(accent ? { borderTop: `4px solid ${accent}` } : {}) }}>
      <div className="container d-flex justify-content-between align-items-center py-2">
        <div className="d-flex align-items-center gap-2">
          {onMenuToggle ? (
            <button
              type="button"
              className="btn btn-link p-0 me-2"
              aria-label="Open menu"
              onClick={onMenuToggle}
              style={{ lineHeight: 0 }}
            >
              <span style={{ display: 'inline-block', width: 22, height: 16 }} aria-hidden>
                <span style={{ display: 'block', height: 2, background: 'var(--text)', marginBottom: 4, borderRadius: 1 }} />
                <span style={{ display: 'block', height: 2, background: 'var(--text)', marginBottom: 4, borderRadius: 1 }} />
                <span style={{ display: 'block', height: 2, background: 'var(--text)', borderRadius: 1 }} />
              </span>
            </button>
          ) : null}
          {avatar ? (
            <img src={avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-light)' }} />
          )}
          {onNameClick || profileHref ? (
            profileHref ? (
              <a
                href={profileHref}
                className="fw-semibold text-decoration-none"
                onClick={onNameClick}
                aria-label="Edit profile"
              >
                Hi, {name || 'there'}
              </a>
            ) : (
              <button
                type="button"
                className="btn btn-link p-0 fw-semibold text-decoration-none"
                onClick={onNameClick}
                aria-label="Edit profile"
              >
                Hi, {name || 'there'}
              </button>
            )
          ) : (
            <span className="fw-semibold">Hi, {name || 'there'}</span>
          )}
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={onLogout}>Log out</button>
      </div>
    </div>
  );
}
