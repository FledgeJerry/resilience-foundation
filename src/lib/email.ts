import { Resend } from "resend";

const FROM = "resilience.foundation <hello@resilience.foundation>";
const SITE = "https://resilience.foundation";

export async function sendInvite(email: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const registerUrl = `${SITE}/register?email=${encodeURIComponent(email)}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're invited to build your co-op on resilience.foundation",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1C2B3A;">
        <div style="background:#163044;padding:2rem;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:#F4F1E8;font-size:1.5rem;margin:0;">
            resilience<span style="color:#E8C84A;">.</span>foundation
          </h1>
          <p style="color:#9AB0C8;font-size:0.9rem;margin:0.5rem 0 0;">Build What You Own</p>
        </div>
        <div style="background:#ffffff;padding:2rem;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
          <p style="font-size:1rem;margin:0 0 1rem;">Hi there,</p>
          <p style="color:#374151;line-height:1.6;margin:0 0 1rem;">
            Someone tried to sign in to resilience.foundation with this email address, but we don't have an account for you yet.
          </p>
          <p style="color:#374151;line-height:1.6;margin:0 0 1.5rem;">
            resilience.foundation helps worker-owned co-ops build their full business plan — from governance and financials
            to ecosystem maps and pitch documents — through a guided handbook wizard.
          </p>
          <div style="text-align:center;margin:2rem 0;">
            <a href="${registerUrl}"
               style="background:#E8C84A;color:#1C2B3A;padding:0.75rem 2rem;border-radius:6px;
                      text-decoration:none;font-weight:700;font-size:1rem;display:inline-block;">
              Create your free account →
            </a>
          </div>
          <p style="color:#6B7280;font-size:0.85rem;line-height:1.5;margin:0 0 1rem;">
            Your email address (${email}) will be pre-filled when you follow the link above.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:1.5rem 0;"/>
          <p style="color:#9CA3AF;font-size:0.75rem;margin:0;">
            resilience.foundation — a project of
            <a href="https://thefledge.com" style="color:#9CA3AF;">The Fledge</a>
            · 1300 Eureka Street, Lansing, MI
          </p>
        </div>
      </div>
    `,
  });
}
