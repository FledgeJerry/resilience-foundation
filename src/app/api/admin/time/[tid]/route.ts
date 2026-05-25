import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ tid: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { tid } = await params;
  const body = await req.json();
  const record = await prisma.trekTimeLog.update({
    where: { id: tid },
    data: {
      ...(body.businessId !== undefined ? { businessId: body.businessId } : {}),
      ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
    },
    include: { business: { select: { id: true, name: true } } },
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
