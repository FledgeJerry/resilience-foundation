import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const connections = await prisma.businessConnection.findMany({
    where: { businessId: id },
    orderBy: { connectedAt: "desc" },
  });
  return NextResponse.json(connections);
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const record = await prisma.businessConnection.create({
    data: {
      businessId: id,
      resource: body.resource?.trim() ?? "",
      description: body.description?.trim() || null,
      connectedAt: body.connectedAt ? new Date(body.connectedAt) : null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record);
}
