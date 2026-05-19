import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let sourceText = "";
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const text = form.get("text") as string | null;

      if (text) {
        sourceText = text;
      } else if (file) {
        if (file.type === "application/pdf") {
          const { extractText } = await import("unpdf");
          const buffer = new Uint8Array(await file.arrayBuffer());
          const { text: pdfText } = await extractText(buffer, { mergePages: true });
          sourceText = pdfText;
        } else {
          sourceText = await file.text();
        }
      }
    } else {
      const body = await req.json();
      sourceText = body.text ?? "";
    }

    if (!sourceText.trim()) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are extracting entrepreneur and business data for a small business support program.

Given the following text (which may be a LEAP application, intake form, survey response, business profile, or any similar document), extract all entrepreneur and business information you can find.

There may be one or more entrepreneurs in the text. Extract each one separately.

For each entrepreneur, extract:
- ownerName: full name of the business owner
- ownerEmail: email address
- ownerPhone: phone number (as written)
- businessName: legal or operating name of the business
- description: brief description of the business / products / services
- industry: primary industry or sector
- formationType: business structure (LLC, Sole Proprietorship, Corporation, Partnership, Cooperative, etc.)
- naicsCode: NAICS code if present
- city: business city
- state: business state (2-letter abbreviation preferred)
- county: county name
- website: website URL if present
- currentFte: number of current full-time employees (integer, null if unknown)
- plannedFte: number of planned/projected full-time employees (integer, null if unknown)
- annualRevenue: annual revenue in dollars (number, null if unknown)
- isMinorityOwned: true if explicitly stated as minority-owned, false otherwise
- isWomanOwned: true if explicitly stated as woman-owned, false otherwise
- isVeteranOwned: true if explicitly stated as veteran-owned, false otherwise
- leapStatus: program status if mentioned (e.g. "Connected", "Not Approved", quarter/year of approval like "Q1 2025"), null if unknown
- notes: any other relevant information not captured above

Leave fields as null if the information is not present. Do not guess.

Return ONLY valid JSON, no markdown, no explanation:
{
  "entrepreneurs": [
    {
      "ownerName": "...",
      "ownerEmail": "...",
      "ownerPhone": "...",
      "businessName": "...",
      "description": "...",
      "industry": "...",
      "formationType": "...",
      "naicsCode": "...",
      "city": "...",
      "state": "...",
      "county": "...",
      "website": "...",
      "currentFte": null,
      "plannedFte": null,
      "annualRevenue": null,
      "isMinorityOwned": false,
      "isWomanOwned": false,
      "isVeteranOwned": false,
      "leapStatus": null,
      "notes": null
    }
  ]
}

TEXT:
${sourceText}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let parsed: { entrepreneurs: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
