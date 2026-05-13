import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAccess(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { date, type, category, description, amount } = await req.json();
  if (!type || !["INCOME", "EXPENSE"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!amount || isNaN(Number(amount))) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const tx = await prisma.businessTransaction.create({
    data: {
      businessId,
      date: new Date(date ?? Date.now()),
      type,
      category: category ?? "General",
      description,
      amount: Number(amount),
    },
  });

  return NextResponse.json(tx, { status: 201 });
}
