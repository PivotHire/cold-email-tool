import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contacts } = await req.json();
  if (!contacts?.length) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  const missing = contacts.filter(
    (c: { email?: string }) => !c.email?.trim()
  );

  if (missing.length === 0) {
    return NextResponse.json({ contacts });
  }

  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an email research assistant. For each company/person below, find or construct the most likely professional email address.

Strategy:
1. If the company name is clearly a domain (e.g. "CreatoRain" → createorain.com), construct firstname@domain or info@domain
2. Use common patterns: firstname@company.com, first.last@company.com, hello@company.com
3. For well-known companies, use their actual domain
4. Clean the company name to form the domain: remove spaces, lowercase, add .com

Return JSON: { "results": [{ "name": "...", "company": "...", "email": "best-guess-email" }] }
Always provide your best guess. Never leave email empty.`,
      },
      {
        role: "user",
        content: JSON.stringify(
          missing.map((c: { name: string; company: string; title?: string }) => ({
            name: c.name,
            company: c.company,
            title: c.title,
          }))
        ),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ contacts });
  }

  const parsed = JSON.parse(content);
  const enriched = parsed.results || [];

  const enrichMap = new Map<string, string>();
  for (const r of enriched) {
    const key = `${r.name}::${r.company}`.toLowerCase();
    if (r.email) enrichMap.set(key, r.email);
  }

  const updated = contacts.map((c: { name: string; company: string; email?: string }) => {
    if (c.email?.trim()) return c;
    const key = `${c.name}::${c.company}`.toLowerCase();
    const found = enrichMap.get(key);
    return found ? { ...c, email: found } : c;
  });

  return NextResponse.json({ contacts: updated });
}
