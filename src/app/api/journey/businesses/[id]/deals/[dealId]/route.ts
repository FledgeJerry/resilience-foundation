import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAccess(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; dealId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId, dealId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ["title", "value", "stage", "contactId", "notes", "closeDate"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }
  if (data.closeDate && typeof data.closeDate === "string") {
    data.closeDate = new Date(data.closeDate);
  }
  if ("value" in data && data.value != null) data.value = Number(data.value);
  if ("contactId" in data && !data.contactId) data.contactId = null;

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data,
    include: { contact: { select: { id: true, name: true } } },
  });
  return NextResponse.json(deal);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; dealId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId, dealId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.deal.delete({ where: { id: dealId } });
  return NextResponse.json({ ok: true });
}
