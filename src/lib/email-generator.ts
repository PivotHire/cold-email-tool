import OpenAI from "openai";

export interface Contact {
  name: string;
  email: string;
  company: string;
  title: string | null;
  industry: string | null;
  companyInfo: Record<string, unknown> | null;
}

export interface AssemblePromptParams {
  baseTemplate: string;
  segmentTemplate?: string | null;
  industryTemplate?: string | null;
  contact: Contact;
  strategyNotes?: string | null;
}

export interface Prompt {
  system: string;
  user: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export function assemblePrompt({
  baseTemplate,
  segmentTemplate,
  industryTemplate,
  contact,
  strategyNotes,
}: AssemblePromptParams): Prompt {
  const systemParts = [baseTemplate];
  if (segmentTemplate) systemParts.push(segmentTemplate);
  if (industryTemplate) systemParts.push(industryTemplate);
  const system = systemParts.join("\n\n");

  const userLines: string[] = [];

  const recipientLine = contact.title
    ? `Recipient: ${contact.name}, ${contact.title} at ${contact.company}`
    : `Recipient: ${contact.name} at ${contact.company}`;
  userLines.push(recipientLine);

  userLines.push(`Email: ${contact.email}`);

  if (contact.industry) {
    userLines.push(`Industry: ${contact.industry}`);
  }

  if (contact.companyInfo !== null && contact.companyInfo !== undefined) {
    const contextParts = Object.entries(contact.companyInfo).map(
      ([key, value]) => `${key}: ${value}`
    );
    if (contextParts.length > 0) {
      userLines.push(`Company context: ${contextParts.join("; ")}`);
    }
  }

  if (strategyNotes) {
    userLines.push(`Additional notes: ${strategyNotes}`);
  }

  userLines.push(
    'Generate a personalized cold email. Output JSON: { "subject": "...", "body": "..." }'
  );

  const user = userLines.join("\n");

  return { system, user };
}

export async function generateEmail(prompt: Prompt): Promise<GeneratedEmail> {
  const client = new OpenAI();

  const response = await client.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from OpenAI");
  }

  const parsed = JSON.parse(content) as GeneratedEmail;
  return parsed;
}
