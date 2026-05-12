import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoverFromProductHunt } from "@/lib/discovery/producthunt";
import { discoverFromYC } from "@/lib/discovery/yc";
import { discoverFromA16Z } from "@/lib/discovery/a16z";
import { discoverFromSequoia } from "@/lib/discovery/sequoia";
import { Segment } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!firstUser) {
    return NextResponse.json({ error: "No users found" }, { status: 500 });
  }

  const [phContacts, ycContacts, a16zContacts, sequoiaContacts] =
    await Promise.all([
      discoverFromProductHunt(),
      discoverFromYC(),
      discoverFromA16Z(),
      discoverFromSequoia(),
    ]);

  const allContacts = [
    ...phContacts,
    ...ycContacts,
    ...a16zContacts,
    ...sequoiaContacts,
  ];

  let created = 0;
  let skipped = 0;
  const total = allContacts.length;

  for (const contact of allContacts) {
    if (!contact.email) {
      skipped++;
      continue;
    }

    const existing = await prisma.contact.findUnique({
      where: { email: contact.email },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.contact.create({
      data: {
        email: contact.email,
        name: contact.name || contact.company,
        company: contact.company,
        title: contact.title || null,
        industry: contact.industry ?? null,
        segment: Segment.STARTUP,
        source: contact.source,
        companyInfo: contact.companyInfo,
        tags: ["auto-discovered"],
        ownerId: firstUser.id,
      },
    });

    created++;
  }

  return NextResponse.json({ created, skipped, total });
}
