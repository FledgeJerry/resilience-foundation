import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DIRECTORY_FIELDS = ["FM-01", "FM-02", "FM-03", "FM-04", "FM-07"];

export async function GET() {
  const coops = await prisma.coop.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      name: true,
      createdAt: true,
      website: true,
      contactEmail: true,
      phone: true,
      handbookEntries: {
        where: { fieldId: { in: DIRECTORY_FIELDS } },
        select: { fieldId: true, value: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = coops.map((c) => {
    const fields = Object.fromEntries(c.handbookEntries.map((e) => [e.fieldId, e.value]));
    return {
      id: c.id,
      name: fields["FM-01"] || c.name,
      tagline: fields["FM-02"] || null,
      location: fields["FM-03"] || null,
      sector: fields["FM-04"] || null,
      foundedAt: fields["FM-07"] || null,
      website: c.website,
      contactEmail: c.contactEmail,
      phone: c.phone,
    };
  });

  return NextResponse.json(result);
}
