"use client";

import { useState } from "react";

type Status = "idle" | "open" | "sending" | "sent" | "error";

export default function FeedbackWidget() {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function open() { setStatus("open"); }
  function close() {
    setStatus("idle");
    setEmail("");
    setMessage("");
    setErrorMsg("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("sent");
        setEmail("");
        setMessage("");
      } else {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error — please try again.");
      setStatus("error");
    }
  }

  const panelOpen = status === "open" || status === "sending" || status === "sent" || status === "error";

  return (
    <>
      {/* Backdrop */}
      {panelOpen && (
        <div
          onClick={close}
          style={{
            position: "fixed", inset: 0, zIndex: 998,
            background: "rgba(0,0,0,0.45)",
          }}
        />
      )}

      {/* Floating panel */}
      {panelOpen && (
        <div style={{
          position: "fixed",
          bottom: "80px",
          right: "24px",
          width: "min(360px, calc(100vw - 48px))",
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          zIndex: 999,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}>
            <span style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              letterSpacing: "0.02em",
            }}>
              Share feedback
            </span>
            <button
              onClick={close}
              aria-label="Close feedback"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1,
                padding: "2px 4px",
              }}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ padding: "18px" }}>
            {status === "sent" ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "8px" }}>✓</div>
                <p style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.85rem",
                  color: "var(--color-success)",
                  fontWeight: 600,
                  margin: "0 0 6px",
                }}>Message received</p>
                <p style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.78rem",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                }}>Thanks — we&apos;ll be in touch.</p>
                <button
                  onClick={close}
                  style={{
                    marginTop: "14px",
                    background: "none", border: "1px solid var(--color-border-strong)",
                    color: "var(--color-text-secondary)", cursor: "pointer",
                    fontFamily: "var(--font-sans)", fontSize: "0.72rem",
                    padding: "6px 16px", borderRadius: "4px",
                  }}
                >Close</button>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.78rem",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  A question, idea, or request? We&apos;d love to hear it.
                </p>

                <div>
                  <label style={{
                    display: "block",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    marginBottom: "5px",
                  }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border-strong)",
                      borderRadius: "4px",
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.85rem",
                      padding: "8px 10px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    marginBottom: "5px",
                  }}>Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={4}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border-strong)",
                      borderRadius: "4px",
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.85rem",
                      padding: "8px 10px",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                {(status === "error") && (
                  <p style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.75rem",
                    color: "var(--color-danger)",
                    margin: 0,
                  }}>{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  style={{
                    background: "var(--color-dome-gold)",
                    color: "#1C2B3A",
                    border: "none",
                    borderRadius: "4px",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    padding: "10px 18px",
                    cursor: status === "sending" ? "not-allowed" : "pointer",
                    opacity: status === "sending" ? 0.65 : 1,
                    alignSelf: "flex-start",
                  }}
                >
                  {status === "sending" ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FAB trigger button */}
      <button
        onClick={panelOpen ? close : open}
        aria-label="Open feedback"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "var(--color-dome-gold)",
          color: "#1C2B3A",
          border: "none",
          cursor: "pointer",
          fontSize: "1.3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          zIndex: 1000,
          transition: "background 0.15s, transform 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-gold-hover)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--color-dome-gold)")}
      >
        {panelOpen ? "×" : "💬"}
      </button>
    </>
  );
}
