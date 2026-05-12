import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    await prisma.trackingEvent.create({
      data: {
        type: "CLICK",
        emailId: id,
        url,
        ip,
        userAgent,
      },
    });
  } catch {
    // Silently ignore — email ID may not exist
  }

  return NextResponse.redirect(url, 302);
}
