function addUtmParams(url: string, campaign: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("utm_source", "pivothire");
  parsed.searchParams.set("utm_medium", "email");
  parsed.searchParams.set("utm_campaign", campaign);
  return parsed.toString();
}

export function injectTrackingPixel(
  html: string,
  emailId: string,
  appUrl: string
): string {
  const pixel = `<img src="${appUrl}/api/track/open/${emailId}" width="1" height="1" style="display:none" alt="" />`;
  return html + pixel;
}

export function rewriteLinks(
  html: string,
  emailId: string,
  appUrl: string,
  campaignName: string
): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_match, targetUrl) => {
    const targetWithUtm = addUtmParams(targetUrl, campaignName);
    const encoded = encodeURIComponent(targetWithUtm);
    return `href="${appUrl}/api/track/click/${emailId}?url=${encoded}&utm_source=pivothire&utm_medium=email&utm_campaign=${encodeURIComponent(campaignName)}"`;
  });
}

export function wrapBodyInHtml(body: string, signature: string): string {
  const bodyHtml = body.replace(/\n/g, "<br/>");
  const signatureHtml = signature.replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
<div>${bodyHtml}</div>
<div style="color: #666; font-size: 13px; margin-top: 16px;">${signatureHtml}</div>
</body>
</html>`;
}
