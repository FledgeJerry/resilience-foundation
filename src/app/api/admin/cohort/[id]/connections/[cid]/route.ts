import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; cid: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { cid } = await params;
  const body = await req.json();
  const record = await prisma.businessConnection.update({
    where: { id: cid },
    data: {
      resource: body.resource?.trim() ?? "",
      description: body.description?.trim() || null,
      connectedAt: body.connectedAt ? new Date(body.connectedAt) : null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { cid } = await params;
  await prisma.businessConnection.delete({ where: { id: cid } });
  return NextResponse.json({ ok: true });
}
