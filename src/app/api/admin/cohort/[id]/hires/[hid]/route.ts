import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; hid: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, hid } = await params;
  const body = await req.json();
  const existing = await prisma.businessHire.findUnique({ where: { id: hid } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newFte = parseInt(body.fteAdded ?? "1", 10);
  const diff = newFte - existing.fteAdded;

  const record = await prisma.businessHire.update({
    where: { id: hid },
    data: {
      fteAdded: newFte,
      hiredAt: body.hiredAt ? new Date(body.hiredAt) : null,
      notes: body.notes?.trim() || null,
    },
  });
  if (diff !== 0) {
    await prisma.business.update({ where: { id }, data: { currentFte: { increment: diff } } });
  }
  return NextResponse.json(record);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, hid } = await params;
  const existing = await prisma.businessHire.findUnique({ where: { id: hid } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.businessHire.delete({ where: { id: hid } });
  await prisma.business.update({ where: { id }, data: { currentFte: { decrement: existing.fteAdded } } });
  return NextResponse.json({ ok: true });
}
