import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — return all businesses (for duplicate detection) + potential duplicate groups
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const businesses = await prisma.business.findMany({
    select: {
      id: true, name: true, street: true, city: true, state: true, zip: true,
      phone: true, stage: true, industry: true, createdAt: true,
      cohort: { select: { name: true } },
      _count: { select: { members: true, contacts: true, deals: true, timeLogs: true } },
      members: { select: { user: { select: { name: true, email: true } } }, take: 3 },
    },
    orderBy: { name: "asc" },
  });

  // Group by normalized name to surface likely duplicates
  const byName = new Map<string, typeof businesses>();
  for (const b of businesses) {
    const key = b.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(b);
  }
  const duplicateGroups = [...byName.values()].filter((g) => g.length > 1);

  return NextResponse.json({ businesses, duplicateGroups });
}

// POST — execute a merge: move all relations from deleteId → keepId, fill empty fields, delete duplicate
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { keepId, deleteId } = await req.json();
  if (!keepId || !deleteId || keepId === deleteId)
    return NextResponse.json({ error: "keepId and deleteId required and must differ" }, { status: 400 });

  const [keep, del] = await Promise.all([
    prisma.business.findUnique({ where: { id: keepId } }),
    prisma.business.findUnique({ where: { id: deleteId } }),
  ]);
  if (!keep || !del)
    return NextResponse.json({ error: "One or both businesses not found" }, { status: 404 });

  // Fill empty fields on keeper from the duplicate
  const fillableFields = [
    "description", "industry", "street", "city", "state", "zip", "lat", "lng",
    "website", "notes", "phone", "county", "formationType", "laraId", "naicsCode",
    "problemStatement", "targetMarket", "uniqueValue", "leapStatus",
    "currentFte", "plannedFte", "annualRevenue",
  ] as const;
  const fill: Record<string, unknown> = {};
  for (const f of fillableFields) {
    if ((keep[f] === null || keep[f] === undefined) && del[f] !== null && del[f] !== undefined) {
      fill[f] = del[f];
    }
  }
  // Boolean flags: set to true if either record has them true
  if (del.isMinorityOwned && !keep.isMinorityOwned) fill.isMinorityOwned = true;
  if (del.isWomanOwned && !keep.isWomanOwned) fill.isWomanOwned = true;
  if (del.isVeteranOwned && !keep.isVeteranOwned) fill.isVeteranOwned = true;
  if (del.isDisabilityOwned && !keep.isDisabilityOwned) fill.isDisabilityOwned = true;

  // BusinessMember has unique(businessId, userId) — skip members already on keeper
  const keepMembers = await prisma.businessMember.findMany({
    where: { businessId: keepId }, select: { userId: true },
  });
  const keepUserIds = new Set(keepMembers.map((m) => m.userId));
  const delMembers = await prisma.businessMember.findMany({
    where: { businessId: deleteId }, select: { userId: true },
  });
  const dupeUserIds = delMembers.filter((m) => keepUserIds.has(m.userId)).map((m) => m.userId);

  await prisma.$transaction(async (tx) => {
    // Remove duplicate members before moving
    if (dupeUserIds.length > 0) {
      await tx.businessMember.deleteMany({
        where: { businessId: deleteId, userId: { in: dupeUserIds } },
      });
    }
    await tx.businessMember.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.contact.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.deal.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.businessTransaction.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.businessPlanEntry.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.businessFunding.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.businessConnection.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.businessHire.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    await tx.trekTimeLog.updateMany({ where: { businessId: deleteId }, data: { businessId: keepId } });
    if (Object.keys(fill).length > 0) {
      await tx.business.update({ where: { id: keepId }, data: fill });
    }
    await tx.business.delete({ where: { id: deleteId } });
  });

  return NextResponse.json({ ok: true, keepId, deleted: deleteId, fieldsFilled: Object.keys(fill) });
}
