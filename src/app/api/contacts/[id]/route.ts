import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.ownerId !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden: you can only edit your own contacts" },
      { status: 403 }
    );
  }

  const body = await request.json();

  const updated = await prisma.contact.update({
    where: { id },
    data: body,
    include: {
      owner: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.ownerId !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden: you can only delete your own contacts" },
      { status: 403 }
    );
  }

  await prisma.contact.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
