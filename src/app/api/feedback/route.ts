import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, message } = await req.json();

  if (!email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Email and message are required." }, { status: 400 });
  }

  const gaiaUrl = process.env.GAIA_INTAKE_URL;
  const gaiaKey = process.env.GAIA_INTAKE_KEY;

  if (!gaiaUrl || !gaiaKey) {
    console.error("[feedback] GAIA_INTAKE_URL or GAIA_INTAKE_KEY not set");
    return NextResponse.json({ error: "Feedback service unavailable." }, { status: 503 });
  }

  let res: Response;
  try {
    res = await fetch(`${gaiaUrl}/api/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gaiaKey}`,
      },
      body: JSON.stringify({
        email: email.trim(),
        message: message.trim(),
        source: "resilience.foundation",
      }),
    });
  } catch (err) {
    console.error("[feedback] could not reach gaia intake:", err);
    return NextResponse.json({ error: "Feedback service unreachable — please try again." }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[feedback] gaia intake returned ${res.status}: ${body}`);
    return NextResponse.json({ error: "Submission failed — please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
