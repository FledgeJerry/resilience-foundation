import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAGE_ORDER = [
  "IDEA", "KNOW_GROUND", "FIND_PEOPLE", "BUILD_STRUCTURE",
  "TEST_SMALL", "GET_SUPPORT", "SUSTAIN", "GROW",
];

const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea",
  KNOW_GROUND: "Know Your Ground",
  FIND_PEOPLE: "Find Your People",
  BUILD_STRUCTURE: "Build Structure",
  TEST_SMALL: "Test Small",
  GET_SUPPORT: "Get Support",
  SUSTAIN: "Sustain It",
  GROW: "Grow the Ecosystem",
};

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Pipeline: all admin-created businesses by stage ────────────────────────
  const businesses = await prisma.business.findMany({
    where: { isAdminCreated: true },
    select: {
      id: true,
      name: true,
      stage: true,
      type: true,
      updatedAt: true,
      members: {
        include: { user: { select: { name: true, email: true } } },
        where: { role: "OWNER" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const stageBuckets: Record<string, { count: number; businesses: { id: string; name: string; owner: string; updatedAt: string }[] }> = {};
  for (const stage of STAGE_ORDER) {
    stageBuckets[stage] = { count: 0, businesses: [] };
  }
  for (const b of businesses) {
    const bucket = stageBuckets[b.stage];
    if (!bucket) continue;
    const owner = b.members[0]?.user.name ?? b.members[0]?.user.email ?? "—";
    bucket.count++;
    bucket.businesses.push({ id: b.id, name: b.name, owner, updatedAt: b.updatedAt.toISOString() });
  }

  const pipeline = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: stageBuckets[stage].count,
    businesses: stageBuckets[stage].businesses.slice(0, 5),
    hasMore: stageBuckets[stage].count > 5,
  }));

  // ── Proposals: all non-closed ──────────────────────────────────────────────
  const proposals = await prisma.proposal.findMany({
    where: { status: { in: ["DRAFT", "OPEN"] } },
    include: { votes: true, proposedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Resolve entity names
  const coopIds = proposals.filter((p) => p.entityType === "COOP").map((p) => p.entityId);
  const housingIds = proposals.filter((p) => p.entityType === "HOUSING").map((p) => p.entityId);

  const [coops, housingProjects] = await Promise.all([
    coopIds.length
      ? prisma.coop.findMany({ where: { id: { in: coopIds } }, select: { id: true, name: true } })
      : [],
    housingIds.length
      ? prisma.housingProject.findMany({ where: { id: { in: housingIds } }, select: { id: true, name: true } })
      : [],
  ]);

  const coopMap = Object.fromEntries(coops.map((c) => [c.id, c.name]));
  const housingMap = Object.fromEntries(housingProjects.map((h) => [h.id, h.name]));

  const proposalList = proposals.map((p) => {
    const yes = p.votes.filter((v) => v.choice === "YES").length + p.offchainYes;
    const no = p.votes.filter((v) => v.choice === "NO").length + p.offchainNo;
    const abstain = p.votes.filter((v) => v.choice === "ABSTAIN").length + p.offchainAbstain;
    const total = yes + no + abstain;
    const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
    const entityName =
      p.entityType === "COOP" ? (coopMap[p.entityId] ?? "Unknown Co-op")
      : (housingMap[p.entityId] ?? "Unknown Housing Project");

    return {
      id: p.id,
      title: p.title,
      entityType: p.entityType,
      entityName,
      status: p.status,
      threshold: p.threshold,
      deadline: p.deadline?.toISOString() ?? null,
      yes,
      no,
      abstain,
      total,
      pct,
      proposedBy: p.proposedBy.name ?? p.proposedBy.email,
      createdAt: p.createdAt.toISOString(),
    };
  });

  // ── Summary counts ─────────────────────────────────────────────────────────
  const totalBusinesses = businesses.length;
  const totalCoops = await prisma.coop.count();
  const totalHousing = await prisma.housingProject.count();
  const openProposals = proposalList.filter((p) => p.status === "OPEN").length;

  return NextResponse.json({
    summary: { totalBusinesses, totalCoops, totalHousing, openProposals },
    pipeline,
    proposals: proposalList,
  });
}
