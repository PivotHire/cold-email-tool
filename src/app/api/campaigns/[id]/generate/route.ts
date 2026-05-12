import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assemblePrompt, generateEmail } from "@/lib/email-generator";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      emails: {
        where: { status: "PENDING" },
        take: 10,
        include: { contact: true },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const templates = await prisma.template.findMany();

  const baseTemplate = templates.find((t) => t.type === "BASE");
  const segmentTemplate = campaign.segment
    ? templates.find((t) => t.type === "SEGMENT" && t.segment === campaign.segment)
    : undefined;
  const industryTemplate = campaign.industry
    ? templates.find((t) => t.type === "INDUSTRY" && t.industry === campaign.industry)
    : undefined;

  if (!baseTemplate) {
    return NextResponse.json(
      { error: "No BASE template found" },
      { status: 400 }
    );
  }

  let generated = 0;

  for (const email of campaign.emails) {
    const contact = email.contact;
    try {
      const prompt = assemblePrompt({
        baseTemplate: baseTemplate.content,
        segmentTemplate: segmentTemplate?.content ?? null,
        industryTemplate: industryTemplate?.content ?? null,
        contact: {
          name: contact.name,
          email: contact.email,
          company: contact.company,
          title: contact.title,
          industry: contact.industry,
          companyInfo: contact.companyInfo as Record<string, unknown> | null,
        },
        strategyNotes: campaign.templatePrompt ?? null,
      });

      const result = await generateEmail(prompt);

      await prisma.email.update({
        where: { id: email.id },
        data: {
          subject: result.subject,
          body: result.body,
          status: "GENERATED",
        },
      });

      generated++;
    } catch {
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "FAILED" },
      });
    }
  }

  const remaining = await prisma.email.count({
    where: { campaignId: id, status: "PENDING" },
  });

  if (remaining === 0) {
    await prisma.campaign.update({
      where: { id },
      data: { status: "REVIEW" },
    });
  }

  return NextResponse.json({ generated, remaining });
}
