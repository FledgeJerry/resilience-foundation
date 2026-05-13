"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

function UserMenu({ session }: { session: { user: { name?: string | null; role?: string } } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayName = session.user.name?.split(" ")[0] ?? "Account";

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu__trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="user-menu__avatar">{displayName[0].toUpperCase()}</span>
        <span className="user-menu__name">{displayName}</span>
        <span className="user-menu__caret">▾</span>
      </button>

      {open && (
        <div className="user-menu__dropdown">
          <div className="user-menu__section-label">My Workspaces</div>
          <Link href="/journey/businesses" className="user-menu__item" onClick={() => setOpen(false)}>
            My Journey
          </Link>
          <Link href="/housing/projects" className="user-menu__item" onClick={() => setOpen(false)}>
            My Housing
          </Link>
          <Link href="/handbook" className="user-menu__item" onClick={() => setOpen(false)}>
            My Handbook
          </Link>
          <div className="user-menu__divider" />
          <Link href="/documents" className="user-menu__item" onClick={() => setOpen(false)}>
            Documents
          </Link>
          <Link href="/profile" className="user-menu__item" onClick={() => setOpen(false)}>
            Profile
          </Link>
          {session.user.role === "ADMIN" && (
            <Link href="/admin" className="user-menu__item" onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
          <div className="user-menu__divider" />
          <button className="user-menu__item user-menu__item--signout" onClick={() => { signOut(); setOpen(false); }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <nav className="site-nav">
      <Link href="/" className="site-nav__logo">
        Crash Out<span>:</span> A Resiliency Hub
      </Link>

      {/* Main platform links — desktop */}
      <ul className="site-nav__links">
        <li><Link href="/">Home</Link></li>
        <li><Link href="/journey">Journey</Link></li>
        <li><Link href="/housing">Housing</Link></li>
        <li><Link href="/co-op">Co-op</Link></li>
        <li><Link href="/directory">Directory</Link></li>
        <li><Link href="/about">About</Link></li>
      </ul>

      {/* Right side — desktop */}
      <div className="site-nav__right">
        {session ? (
          <UserMenu session={session} />
        ) : (
          <>
            <Link href="/login" className="site-nav__signin">Sign in</Link>
            <Link href="/register" className="btn btn--primary btn--sm">Get Started</Link>
          </>
        )}
      </div>

      {/* Hamburger — mobile */}
      <button
        className="site-nav__hamburger"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <ul className="site-nav__drawer">
          <li className="drawer-section-label">Explore</li>
          <li><Link href="/" onClick={() => setOpen(false)}>Home</Link></li>
          <li><Link href="/journey" onClick={() => setOpen(false)}>Journey</Link></li>
          <li><Link href="/housing" onClick={() => setOpen(false)}>Housing</Link></li>
          <li><Link href="/co-op" onClick={() => setOpen(false)}>Co-op</Link></li>
          <li><Link href="/directory" onClick={() => setOpen(false)}>Directory</Link></li>
          <li><Link href="/about" onClick={() => setOpen(false)}>About</Link></li>

          {session ? (
            <>
              <li className="drawer-section-label drawer-section-label--mt">My Workspaces</li>
              <li><Link href="/journey/businesses" onClick={() => setOpen(false)}>My Journey</Link></li>
              <li><Link href="/housing/projects" onClick={() => setOpen(false)}>My Housing</Link></li>
              <li><Link href="/handbook" onClick={() => setOpen(false)}>My Handbook</Link></li>
              <li><Link href="/documents" onClick={() => setOpen(false)}>Documents</Link></li>
              <li><Link href="/profile" onClick={() => setOpen(false)}>Profile</Link></li>
              {session.user.role === "ADMIN" && (
                <li><Link href="/admin" onClick={() => setOpen(false)}>Admin</Link></li>
              )}
              <li>
                <button onClick={() => { signOut(); setOpen(false); }} className="site-nav__signout">
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="drawer-section-label drawer-section-label--mt">Account</li>
              <li><Link href="/login" onClick={() => setOpen(false)}>Sign in</Link></li>
              <li>
                <Link href="/register" className="btn btn--primary btn--sm" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </li>
            </>
          )}
        </ul>
      )}
    </nav>
  );
}
