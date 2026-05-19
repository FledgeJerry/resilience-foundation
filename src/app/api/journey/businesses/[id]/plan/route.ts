import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkMember(businessId: string, userId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const member = await checkMember(id, session.user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.businessPlanEntry.findMany({ where: { businessId: id } });
  const map: Record<string, string> = {};
  for (const e of entries) map[e.fieldId] = e.value;
  return NextResponse.json(map);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const member = await checkMember(id, session.user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body: { fieldId: string; value: string } = await req.json();
  const { fieldId, value } = body;

  const entry = await prisma.businessPlanEntry.upsert({
    where: { businessId_fieldId: { businessId: id, fieldId } },
    update: { value },
    create: { businessId: id, fieldId, value },
  });

  return NextResponse.json(entry);
}
