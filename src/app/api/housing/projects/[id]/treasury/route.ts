import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getMembership(userId: string, projectId: string) {
  return prisma.housingMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "100");

    const entries = await prisma.treasuryEntry.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET treasury:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { date, type, category, description, amount } = await req.json();
    if (!date || !type || !category || amount === undefined) {
      return NextResponse.json({ error: "date, type, category, amount required" }, { status: 400 });
    }
    if (type !== "INCOME" && type !== "EXPENSE") {
      return NextResponse.json({ error: "type must be INCOME or EXPENSE" }, { status: 400 });
    }

    const entry = await prisma.treasuryEntry.create({
      data: { projectId, date: new Date(date), type, category, description, amount: Number(amount) },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("POST treasury:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { entryId } = await req.json();
    if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

    await prisma.treasuryEntry.delete({ where: { id: entryId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE treasury:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
