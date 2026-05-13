import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAccess(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, value, stage, contactId, notes, closeDate } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const deal = await prisma.deal.create({
    data: {
      businessId,
      title: title.trim(),
      value: value != null ? Number(value) : undefined,
      stage: stage ?? "PROSPECT",
      contactId: contactId || undefined,
      notes,
      closeDate: closeDate ? new Date(closeDate) : undefined,
    },
    include: { contact: { select: { id: true, name: true } } },
  });

  return NextResponse.json(deal, { status: 201 });
}
