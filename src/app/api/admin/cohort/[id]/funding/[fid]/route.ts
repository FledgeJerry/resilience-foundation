import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; fid: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { fid } = await params;
  const body = await req.json();
  const record = await prisma.businessFunding.update({
    where: { id: fid },
    data: {
      type: body.type,
      amount: body.amount != null ? parseFloat(body.amount) : null,
      source: body.source?.trim() ?? "",
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { fid } = await params;
  await prisma.businessFunding.delete({ where: { id: fid } });
  return NextResponse.json({ ok: true });
}
