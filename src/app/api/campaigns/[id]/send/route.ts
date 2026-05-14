import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSignature, sendEmail } from "@/lib/email-sender";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.smtpHost || !user?.smtpPort || !user?.smtpUser || !user?.smtpPass) {
    return NextResponse.json(
      { error: "SMTP not configured. Go to Settings to set up your email." },
      { status: 400 }
    );
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: "SENDING" },
  });

  const signature = buildSignature(user.signature, {
    name: user.name,
    title: user.title,
    email: user.email,
  });

  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  const approvedEmails = await prisma.email.findMany({
    where: { campaignId: id, status: "APPROVED" },
    include: { contact: true },
  });

  let sent = 0;
  let failed = 0;

  for (const email of approvedEmails) {
    const alreadySent = await prisma.email.findFirst({
      where: {
        contactId: email.contactId,
        status: "SENT",
        id: { not: email.id },
      },
    });

    if (alreadySent) {
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      sent++;
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
    } catch (err) {
      console.error(`Failed to send email ${email.id}:`, err);
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "FAILED" },
      });
      failed++;
    }
  }

  const remainingApproved = await prisma.email.count({
    where: { campaignId: id, status: "APPROVED" },
  });

  if (remainingApproved === 0) {
    await prisma.campaign.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
  }

  return NextResponse.json({ sent, failed });
}
