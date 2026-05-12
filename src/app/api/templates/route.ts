import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateType } from "@/generated/prisma/enums";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.template.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, segment, industry, content } = body;

  if (!name || !type || !content) {
    return NextResponse.json(
      { error: "name, type, and content are required" },
      { status: 400 }
    );
  }

  const template = await prisma.template.create({
    data: {
      name,
      type: type as TemplateType,
      segment: segment ?? null,
      industry: industry ?? null,
      content,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
