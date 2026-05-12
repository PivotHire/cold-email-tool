import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { emails: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, segment, industry, templatePrompt, contactIds } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json(
      { error: "contactIds must be a non-empty array" },
      { status: 400 }
    );
  }

  // Dedup: find contacts that already have a SENT email in any campaign
  const sentEmails = await prisma.email.findMany({
    where: {
      contactId: { in: contactIds },
      status: "SENT",
    },
    select: { contactId: true },
  });

  const sentContactIds = new Set(sentEmails.map((e) => e.contactId));
  const validContactIds = contactIds.filter((id: string) => !sentContactIds.has(id));
  const skipped = contactIds.length - validContactIds.length;

  const campaign = await prisma.campaign.create({
    data: {
      name,
      segment: segment ?? null,
      industry: industry ?? null,
      templatePrompt: templatePrompt ?? null,
      status: "GENERATING",
      createdById: session.user.id,
      emails: {
        create: validContactIds.map((contactId: string) => ({
          contactId,
          status: "PENDING",
        })),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { emails: true } },
    },
  });

  return NextResponse.json({ campaign, skipped }, { status: 201 });
}
