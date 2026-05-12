import { describe, it, expect } from "vitest";
import { injectTrackingPixel, rewriteLinks } from "@/lib/tracking";

describe("injectTrackingPixel", () => {
  it("appends tracking pixel to HTML body", () => {
    const html = "<p>Hello World</p>";
    const result = injectTrackingPixel(html, "email-123", "https://app.example.com");
    expect(result).toContain("<p>Hello World</p>");
    expect(result).toContain('src="https://app.example.com/api/track/open/email-123"');
    expect(result).toContain('width="1"');
    expect(result).toContain('height="1"');
  });
});

describe("rewriteLinks", () => {
  it("replaces href with tracked redirect", () => {
    const html = '<a href="https://pivothire.tech">Visit us</a>';
    const result = rewriteLinks(html, "email-123", "https://app.example.com", "test-campaign");
    expect(result).toContain("/api/track/click/email-123");
    expect(result).toContain("url=");
    expect(result).toContain("utm_source=pivothire");
  });

  it("handles multiple links", () => {
    const html = '<a href="https://a.com">A</a> <a href="https://b.com">B</a>';
    const result = rewriteLinks(html, "e1", "https://app.example.com", "camp");
    const matches = result.match(/api\/track\/click/g);
    expect(matches).toHaveLength(2);
  });

  it("does not rewrite mailto links", () => {
    const html = '<a href="mailto:test@test.com">Email</a>';
    const result = rewriteLinks(html, "e1", "https://app.example.com", "camp");
    expect(result).toContain("mailto:test@test.com");
    expect(result).not.toContain("api/track/click");
  });
});
