import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Segment } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const segment = searchParams.get("segment");
  const industry = searchParams.get("industry");
  const source = searchParams.get("source");
  const ownerId = searchParams.get("ownerId");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (segment) where.segment = segment;
  if (industry) where.industry = industry;
  if (source) where.source = source;
  if (ownerId) where.ownerId = ownerId;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      owner: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, name, company, title, industry, segment, source, companyInfo, tags } = body;

  if (!email || !name || !company) {
    return NextResponse.json(
      { error: "email, name, and company are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A contact with this email already exists" },
      { status: 409 }
    );
  }

  const contact = await prisma.contact.create({
    data: {
      email,
      name,
      company,
      title: title ?? null,
      industry: industry ?? null,
      segment: (segment as Segment) ?? Segment.STARTUP,
      source: source ?? "manual",
      companyInfo: companyInfo ?? undefined,
      tags: tags ?? [],
      ownerId: session.user.id,
    },
    include: {
      owner: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
