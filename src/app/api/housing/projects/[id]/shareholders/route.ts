import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getMembership(userId: string, projectId: string) {
  return prisma.housingMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const shareholders = await prisma.housingShareHolder.findMany({
      where: { projectId },
      orderBy: [{ isTreasury: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(shareholders);
  } catch (err) {
    console.error("GET shareholders:", err);
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

    const { name, email, phone, shareCount, amountPaid, isTreasury, notes } = await req.json();
    if (!name?.trim() || !shareCount) {
      return NextResponse.json({ error: "name and shareCount required" }, { status: 400 });
    }

    const shareholder = await prisma.housingShareHolder.create({
      data: { projectId, name: name.trim(), email, phone, shareCount: Number(shareCount), amountPaid: Number(amountPaid ?? 0), isTreasury: Boolean(isTreasury), notes },
    });

    return NextResponse.json(shareholder, { status: 201 });
  } catch (err) {
    console.error("POST shareholders:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { shareholderId, ...data } = await req.json();
    if (!shareholderId) return NextResponse.json({ error: "shareholderId required" }, { status: 400 });

    const updated = await prisma.housingShareHolder.update({
      where: { id: shareholderId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.shareCount !== undefined && { shareCount: Number(data.shareCount) }),
        ...(data.amountPaid !== undefined && { amountPaid: Number(data.amountPaid) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH shareholders:", err);
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

    const { shareholderId } = await req.json();
    if (!shareholderId) return NextResponse.json({ error: "shareholderId required" }, { status: 400 });

    await prisma.housingShareHolder.delete({ where: { id: shareholderId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE shareholders:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
