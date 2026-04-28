import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getMembership(userId: string, coopId: string) {
  return prisma.coopMember.findUnique({
    where: { coopId_userId: { coopId, userId } },
  });
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const coopId = searchParams.get("coopId");
    if (!coopId) return NextResponse.json({ error: "coopId required" }, { status: 400 });

    const asUserId = searchParams.get("userId");
    if (asUserId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const membership = asUserId ? true : await getMembership(session.user.id, coopId);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const entries = await prisma.handbookEntry.findMany({
      where: { coopId },
      select: { fieldId: true, value: true, updatedAt: true },
    });

    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET /api/handbook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { coopId, fieldId, value } = await req.json();
  if (!coopId || !fieldId) return NextResponse.json({ error: "coopId and fieldId required" }, { status: 400 });

  const membership = await getMembership(session.user.id, coopId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = await prisma.handbookEntry.upsert({
    where: { coopId_fieldId: { coopId, fieldId } },
    update: { value },
    create: { coopId, fieldId, value },
  });

  return NextResponse.json(entry);
}
