"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Nav() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <li><Link href="/" onClick={() => setOpen(false)}>Home</Link></li>
      <li><Link href="/housing" onClick={() => setOpen(false)}>Housing</Link></li>
      <li><Link href="/about" onClick={() => setOpen(false)}>About</Link></li>
      <li><Link href="/directory" onClick={() => setOpen(false)}>Directory</Link></li>
      {session && (
        <>
          <li><Link href="/handbook" onClick={() => setOpen(false)}>My Handbook</Link></li>
          <li><Link href="/documents" onClick={() => setOpen(false)}>Documents</Link></li>
          <li><Link href="/profile" onClick={() => setOpen(false)}>Profile</Link></li>
          {session.user.role === "ADMIN" && (
            <li><Link href="/admin" onClick={() => setOpen(false)}>Admin</Link></li>
          )}
        </>
      )}
      {session ? (
        <li>
          <button onClick={() => { signOut(); setOpen(false); }} className="site-nav__signout">
            Sign out
          </button>
        </li>
      ) : (
        <>
          <li><Link href="/login" onClick={() => setOpen(false)}>Sign in</Link></li>
          <li>
            <Link href="/register" className="btn btn--primary btn--sm" onClick={() => setOpen(false)}>
              Get Started
            </Link>
          </li>
        </>
      )}
    </>
  );

  return (
    <nav className="site-nav">
      <Link href="/" className="site-nav__logo">
        Crash Out<span>:</span> A Resiliency Hub
      </Link>

      <ul className="site-nav__links">{links}</ul>

      <button
        className="site-nav__hamburger"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
      </button>

      {open && <ul className="site-nav__drawer">{links}</ul>}
    </nav>
  );
}
