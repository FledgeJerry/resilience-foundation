import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [businesses, coops, housing] = await Promise.all([
    prisma.business.findMany({
      select: {
        id: true, name: true, type: true, stage: true, industry: true,
        city: true, state: true, website: true, description: true,
        isMinorityOwned: true, isWomanOwned: true, isVeteranOwned: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.coop.findMany({
      select: {
        id: true, name: true, website: true, contactEmail: true, phone: true,
        street: true, city: true, state: true, zip: true, createdAt: true,
        handbookEntries: {
          where: { fieldId: { in: ["FM-01", "FM-02", "FM-03", "FM-04"] } },
          select: { fieldId: true, value: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.housingProject.findMany({
      select: {
        id: true, name: true, status: true, address: true, city: true,
        state: true, zip: true, purchasePrice: true, totalShares: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const formattedCoops = coops.map((c) => {
    const fields = Object.fromEntries(c.handbookEntries.map((e) => [e.fieldId, e.value]));
    return {
      id: c.id,
      name: fields["FM-01"] || c.name,
      tagline: fields["FM-02"] || null,
      location: fields["FM-03"] || null,
      sector: fields["FM-04"] || null,
      website: c.website,
      contactEmail: c.contactEmail,
      phone: c.phone,
      city: c.city,
      state: c.state,
      createdAt: c.createdAt,
    };
  });

  return NextResponse.json({
    businesses,
    coops: formattedCoops,
    housing,
    updatedAt: new Date().toISOString(),
  });
}
