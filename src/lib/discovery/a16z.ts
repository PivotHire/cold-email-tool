import OpenAI from "openai";

type DiscoveredContact = {
  name: string;
  email: string | null;
  company: string;
  title: string;
  industry: string | null;
  source: string;
  companyInfo: Record<string, string>;
};

type ExtractedCompany = {
  name: string;
  url: string;
  category: string;
};

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function discoverFromA16Z(): Promise<DiscoveredContact[]> {
  try {
    const htmlResponse = await fetch("https://a16z.com/portfolio/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PivotHire-Discovery/1.0)",
      },
    });

    if (!htmlResponse.ok) {
      return [];
    }

    const html = await htmlResponse.text();
    const truncated = html.slice(0, 50000);

    const client = new OpenAI();

    const completion = await client.chat.completions.create({
      model: "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract structured data from HTML. Return JSON only.",
        },
        {
          role: "user",
          content: `Extract up to 20 portfolio companies from this HTML. Return JSON: { "companies": [{ "name": string, "url": string, "category": string }] }\n\nHTML:\n${truncated}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as { companies: ExtractedCompany[] };
    const companies = parsed.companies ?? [];

    const results: DiscoveredContact[] = [];

    for (const company of companies) {
      const domain = company.url ? extractDomain(company.url) : null;
      const email = domain ? `info@${domain}` : null;

      results.push({
        name: company.name ?? "",
        email,
        company: company.name ?? "",
        title: "",
        industry: company.category ?? null,
        source: "a16z",
        companyInfo: {
          investor: "a16z",
          category: company.category ?? "",
          url: company.url ?? "",
        },
      });
    }

    return results;
  } catch {
    return [];
  }
}
