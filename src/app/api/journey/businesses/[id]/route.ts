import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getMembership(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      transactions: { orderBy: { date: "desc" } },
      deals: {
        orderBy: { createdAt: "desc" },
        include: { contact: { select: { id: true, name: true } } },
      },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  return NextResponse.json({ ...business, role: membership.role });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = [
    "name", "description", "type", "stage", "industry", "city", "state", "website",
    "notes", "problemStatement", "targetMarket", "uniqueValue",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const business = await prisma.business.update({ where: { id }, data });
  return NextResponse.json(business);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
