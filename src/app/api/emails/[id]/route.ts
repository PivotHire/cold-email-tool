import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmailStatus } from "@/generated/prisma/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const body = await request.json();

  const data: { subject?: string; body?: string; status?: EmailStatus } = {};
  if ("subject" in body) data.subject = body.subject as string;
  if ("body" in body) data.body = body.body as string;
  if ("status" in body && Object.values(EmailStatus).includes(body.status as EmailStatus)) {
    data.status = body.status as EmailStatus;
  }

  const updated = await prisma.email.update({
    where: { id },
    data,
    include: {
      contact: { select: { name: true, email: true, company: true } },
    },
  });

  return NextResponse.json(updated);
}
