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

export async function discoverFromProductHunt(): Promise<DiscoveredContact[]> {
  try {
    const query = `
      query {
        posts(first: 20, order: NEWEST) {
          edges {
            node {
              name
              tagline
              website
              makers {
                name
                headline
              }
            }
          }
        }
      }
    `;

    const response = await fetch("https://www.producthunt.com/frontend/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    const posts = data?.data?.posts?.edges ?? [];

    const results: DiscoveredContact[] = [];

    for (const edge of posts) {
      const post = edge?.node;
      if (!post) continue;

      const domain = post.website ? extractDomain(post.website) : null;
      const makers: { name: string; headline: string }[] = post.makers ?? [];

      for (const maker of makers) {
        const firstName = maker.name?.split(" ")[0]?.toLowerCase() ?? null;
        const email = firstName && domain ? `${firstName}@${domain}` : null;

        results.push({
          name: maker.name ?? "",
          email,
          company: post.name ?? "",
          title: maker.headline ?? "",
          industry: null,
          source: "producthunt",
          companyInfo: {
            tagline: post.tagline ?? "",
            website: post.website ?? "",
          },
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}
