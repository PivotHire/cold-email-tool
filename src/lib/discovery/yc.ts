type DiscoveredContact = {
  name: string;
  email: string | null;
  company: string;
  title: string;
  industry: string | null;
  source: string;
  companyInfo: Record<string, string>;
};

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function discoverFromYC(): Promise<DiscoveredContact[]> {
  try {
    const response = await fetch(
      "https://api.ycombinator.com/v0.1/companies?batch=latest&page=1&per_page=50",
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    const companies: Record<string, unknown>[] = data?.companies ?? data ?? [];

    const results: DiscoveredContact[] = [];

    for (const company of companies) {
      const url = (company.url as string) ?? (company.website as string) ?? null;
      const domain = url ? extractDomain(url) : null;
      const email = domain ? `founders@${domain}` : null;

      results.push({
        name: (company.name as string) ?? "",
        email,
        company: (company.name as string) ?? "",
        title: "Founder",
        industry: (company.industry as string) ?? null,
        source: "yc",
        companyInfo: {
          batch: (company.batch as string) ?? "",
          one_liner: (company.one_liner as string) ?? "",
        },
      });
    }

    return results;
  } catch {
    return [];
  }
}
