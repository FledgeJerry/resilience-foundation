import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; tid: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { tid } = await params;
  const body = await req.json();
  const record = await prisma.trekTimeLog.update({
    where: { id: tid },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      quarter: body.quarter?.trim() || undefined,
      category: body.category?.trim() || undefined,
      hours: body.hours != null ? parseFloat(body.hours) : undefined,
      staffMember: body.staffMember?.trim() || undefined,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { tid } = await params;
  await prisma.trekTimeLog.delete({ where: { id: tid } });
  return NextResponse.json({ ok: true });
}
