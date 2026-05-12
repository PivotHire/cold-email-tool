import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSignature, sendEmail } from "@/lib/email-sender";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let sent = 0;

  const campaigns = await prisma.campaign.findMany({
    where: { status: "SENDING" },
  });

  for (const campaign of campaigns) {
    const user = await prisma.user.findUnique({
      where: { id: campaign.createdById },
    });

    if (
      !user ||
      !user.smtpHost ||
      !user.smtpPort ||
      !user.smtpUser ||
      !user.smtpPass
    ) {
      continue;
    }

    const signature = buildSignature(user.signature, {
      name: user.name,
      title: user.title,
      email: user.email,
    });

    const approvedEmails = await prisma.email.findMany({
      where: {
        campaignId: campaign.id,
        status: "APPROVED",
      },
      include: { contact: true },
      take: 5,
    });

    for (const email of approvedEmails) {
      // Dedup: skip if any SENT email already exists for this contact across all campaigns
      const alreadySent = await prisma.email.findFirst({
        where: {
          contactId: email.contactId,
          status: "SENT",
        },
      });

      if (alreadySent) {
        continue;
      }

      try {
        await sendEmail({
          to: email.contact.email,
          subject: email.subject,
          body: email.body,
          signature,
          emailId: email.id,
          campaignName: campaign.name,
          smtp: {
            host: user.smtpHost,
            port: user.smtpPort,
            user: user.smtpUser,
            pass: user.smtpPass,
          },
          fromName: user.name,
          fromEmail: user.email,
          appUrl,
        });

        await prisma.email.update({
          where: { id: email.id },
          data: { status: "SENT", sentAt: new Date() },
        });

        sent++;
      } catch {
        await prisma.email.update({
          where: { id: email.id },
          data: { status: "FAILED" },
        });
      }
    }

    // If no APPROVED emails remain, mark campaign as COMPLETED
    const remainingApproved = await prisma.email.count({
      where: {
        campaignId: campaign.id,
        status: "APPROVED",
      },
    });

    if (remainingApproved === 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "COMPLETED" },
      });
    }
  }

  return NextResponse.json({ sent });
}
