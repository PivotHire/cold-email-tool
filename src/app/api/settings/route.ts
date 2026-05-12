import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  title: true,
  signature: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPass: true,
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: USER_SELECT,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

const ALLOWED_FIELDS = [
  "name",
  "title",
  "signature",
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpPass",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Whitelist fields
  const data: Partial<Record<AllowedField, string | number | null>> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      if (field === "smtpPort") {
        const port = body[field];
        data[field] = port === null || port === "" ? null : Number(port);
      } else {
        data[field] = body[field] ?? null;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: data as any,
    select: USER_SELECT,
  });

  return NextResponse.json(user);
}
