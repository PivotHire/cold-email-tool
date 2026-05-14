import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

type ContactInput = {
  name: string;
  company: string;
  email?: string;
  title?: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contacts } = await req.json();
  if (!contacts?.length) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  const missing = contacts.filter((c: ContactInput) => !c.email?.trim());
  if (missing.length === 0) {
    return NextResponse.json({ contacts });
  }

  const openai = new OpenAI();
  const enrichMap = new Map<string, string>();

  // Search for each contact's email using web search (max 10 at a time)
  const batch = missing.slice(0, 10);
  await Promise.all(
    batch.map(async (c: ContactInput) => {
      try {
        const response = await openai.responses.create({
          model: "gpt-5.4-mini",
          tools: [{ type: "web_search_preview" }],
          instructions:
            "You are an email research assistant. Search the web to find the real professional email address for this person or their company. Look for their company website, LinkedIn, Crunchbase, or any public source. Return ONLY the email address you found — nothing else. If you truly cannot find any email, return NOT_FOUND.",
          input: `Find the professional email address for ${c.name}${c.title ? `, ${c.title}` : ""} at ${c.company}`,
        });

        const text =
          typeof response.output_text === "string"
            ? response.output_text.trim()
            : "";
        const emailMatch = text.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        );
        if (emailMatch) {
          const key = `${c.name}::${c.company}`.toLowerCase();
          enrichMap.set(key, emailMatch[0].toLowerCase());
        }
      } catch (err) {
        console.error(`Failed to enrich ${c.name} at ${c.company}:`, err);
      }
    })
  );

  const updated = contacts.map((c: ContactInput) => {
    if (c.email?.trim()) return c;
    const key = `${c.name}::${c.company}`.toLowerCase();
    const found = enrichMap.get(key);
    return found ? { ...c, email: found } : c;
  });

  return NextResponse.json({ contacts: updated });
}
