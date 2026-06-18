import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET ?search=name  — try to look up a business name in LARA COFS
// GET (no params)   — return businesses missing laraDate
// PATCH             — save laraId + laraDate to a business record

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  if (search) {
    // Try to scrape LARA COFS search results
    try {
      const url = `https://cofs.lara.state.mi.us/CorpWeb/CorpSearch/CorpSearch.aspx?Action=FREEFORMSEARCH&ENTITY_NAME=${encodeURIComponent(search)}&CAN=&TYPE=ALL&SEARCH_TYPE=BEGINS_WITH&LOCATION=ALL`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; resilience-foundation/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return NextResponse.json({ results: [], error: `LARA returned ${res.status}` });

      const html = await res.text();

      // Parse the results table — LARA COFS renders a table with columns:
      // Entity Name | ID (CAN) | Type | Status | Formation Date | Agent
      const rows: { name: string; laraId: string; type: string; status: string; formationDate: string | null }[] = [];
      const rowRegex = /<tr[^>]*class="[^"]*SearchResultRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();

      let rowMatch;
      while ((rowMatch = rowRegex.exec(html)) !== null) {
        const cells: string[] = [];
        let cellMatch;
        const cellRe = new RegExp(cellRegex.source, "gi");
        while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
          cells.push(stripTags(cellMatch[1]));
        }
        if (cells.length >= 4) {
          rows.push({
            name: cells[0] ?? "",
            laraId: cells[1] ?? "",
            type: cells[2] ?? "",
            status: cells[3] ?? "",
            formationDate: cells[4] ? parseDate(cells[4]) : null,
          });
        }
      }

      return NextResponse.json({ results: rows, searchUrl: url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ results: [], error: msg });
    }
  }

  // No search param — return businesses missing laraDate
  const businesses = await prisma.business.findMany({
    where: { laraDate: null },
    select: {
      id: true, name: true, city: true, state: true, formationType: true,
      laraId: true, formationDate: true, stage: true,
      members: { select: { user: { select: { name: true, email: true } } }, take: 2 },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ businesses });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, laraId, laraDate } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.business.update({
    where: { id },
    data: {
      ...(laraId !== undefined ? { laraId: laraId || null } : {}),
      ...(laraDate ? { laraDate: new Date(laraDate) } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

function parseDate(s: string): string | null {
  // LARA dates come as M/D/YYYY or MM/DD/YYYY
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}
