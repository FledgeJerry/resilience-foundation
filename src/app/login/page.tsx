"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LoginState = "idle" | "loading" | "wrong_password" | "no_account" | "invite_loading" | "invite_sent";

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>("idle");
  const [email, setEmail] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    const submittedEmail = (fd.get("email") as string).toLowerCase().trim();
    setEmail(submittedEmail);

    const result = await signIn("credentials", {
      email: submittedEmail,
      password: fd.get("password"),
      redirect: false,
    });

    if (!result?.error) {
      router.push("/handbook");
      router.refresh();
      return;
    }

    // Distinguish "no account" from "wrong password"
    const check = await fetch(`/api/invite?email=${encodeURIComponent(submittedEmail)}`);
    const { exists } = await check.json();
    setState(exists ? "wrong_password" : "no_account");
  }

  async function sendInvite() {
    setState("invite_loading");
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setState(res.ok ? "invite_sent" : "wrong_password");
  }

  const isLoading = state === "loading" || state === "invite_loading";

  return (
    <div style={{ maxWidth: "420px", margin: "3rem auto" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Sign in</h1>
      <p style={{ marginBottom: "2rem" }}>Welcome back to resilience.foundation</p>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            defaultValue={email}
            onChange={() => setState("idle")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              style={{ paddingRight: "3rem" }}
              onChange={() => setState("idle")}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--color-text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-sans)",
              }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {state === "wrong_password" && (
          <div className="alert alert--error">Incorrect password.</div>
        )}

        <button type="submit" disabled={isLoading} className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
          {state === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {/* No account found — invite offer */}
      {(state === "no_account" || state === "invite_loading" || state === "invite_sent") && (
        <div className="card" style={{ marginTop: "1rem", borderColor: "var(--color-dome-gold)" }}>
          {state === "invite_sent" ? (
            <>
              <p style={{ fontWeight: 600, color: "var(--color-dome-gold)", margin: "0 0 0.25rem" }}>Invite sent!</p>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", margin: 0 }}>
                Check your inbox at <strong>{email}</strong> for a link to create your account.
              </p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600, margin: "0 0 0.25rem" }}>No account found for <span style={{ color: "var(--color-dome-gold)" }}>{email}</span></p>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", margin: "0 0 1rem" }}>
                Want us to send you an invite link to get started?
              </p>
              <button
                onClick={sendInvite}
                disabled={state === "invite_loading"}
                className="btn btn--primary btn--sm"
              >
                {state === "invite_loading" ? "Sending…" : "Send me an invite →"}
              </button>
            </>
          )}
        </div>
      )}

      <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "var(--color-dome-gold)" }}>Get started</Link>
      </p>
    </div>
  );
}
