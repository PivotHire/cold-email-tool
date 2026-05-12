import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const openai = new OpenAI();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract contact information from the provided text. Return a JSON object with a "contacts" array. Each contact should have:
- name (string, required)
- email (string, required)
- company (string, required)
- title (string or null)
- industry (string or null - e.g. "fintech", "ecommerce", "healthcare", "saas", "manufacturing")
- segment ("STARTUP" or "TRADITIONAL")

If you cannot determine a field, set it to null (except name, email, company which are required — skip the contact if these are missing).
Infer segment from context: if the company sounds like a startup/tech company, use "STARTUP". If it sounds like a traditional/established business, use "TRADITIONAL".`,
      },
      { role: "user", content: text },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "No response from AI" }, { status: 500 });
  }

  const parsed = JSON.parse(content);
  return NextResponse.json(parsed);
}
