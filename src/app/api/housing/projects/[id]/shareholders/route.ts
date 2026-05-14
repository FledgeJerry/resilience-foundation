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

    const { name, email, phone, shareCount, amountPaid, isTreasury, notes, isRenter, monthlyRentPaid, moveInDate, securityDeposit, leaseEndDate, occupantCount, emergencyContactName, emergencyContactPhone } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const shareholder = await prisma.housingShareHolder.create({
      data: {
        projectId,
        name: name.trim(),
        email,
        phone,
        shareCount: Number(shareCount ?? 0),
        amountPaid: Number(amountPaid ?? 0),
        isTreasury: Boolean(isTreasury),
        notes,
        isRenter: Boolean(isRenter),
        monthlyRentPaid: monthlyRentPaid != null ? Number(monthlyRentPaid) : undefined,
        moveInDate: moveInDate ? new Date(moveInDate) : undefined,
        securityDeposit: securityDeposit != null ? Number(securityDeposit) : undefined,
        leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : undefined,
        occupantCount: occupantCount != null ? Number(occupantCount) : undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
      },
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
        ...(data.isRenter !== undefined && { isRenter: Boolean(data.isRenter) }),
        ...(data.monthlyRentPaid !== undefined && { monthlyRentPaid: data.monthlyRentPaid != null ? Number(data.monthlyRentPaid) : null }),
        ...(data.moveInDate !== undefined && { moveInDate: data.moveInDate ? new Date(data.moveInDate) : null }),
        ...(data.moveOutDate !== undefined && { moveOutDate: data.moveOutDate ? new Date(data.moveOutDate) : null }),
        ...(data.equityBalance !== undefined && { equityBalance: Number(data.equityBalance) }),
        ...(data.securityDeposit !== undefined && { securityDeposit: data.securityDeposit != null ? Number(data.securityDeposit) : null }),
        ...(data.leaseEndDate !== undefined && { leaseEndDate: data.leaseEndDate ? new Date(data.leaseEndDate) : null }),
        ...(data.occupantCount !== undefined && { occupantCount: data.occupantCount != null ? Number(data.occupantCount) : null }),
        ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName || null }),
        ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone || null }),
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
