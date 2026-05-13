import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAccess(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId, txId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.businessTransaction.delete({ where: { id: txId } });
  return NextResponse.json({ ok: true });
}
