import nodemailer from "nodemailer";
import { wrapBodyInHtml, rewriteLinks, injectTrackingPixel } from "@/lib/tracking";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  signature: string;
  emailId: string;
  campaignName: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  fromName: string;
  fromEmail: string;
  appUrl: string;
};

export function buildSignature(
  template: string,
  vars: { name: string; title: string; email: string }
): string {
  return template
    .replace(/\{name\}/g, vars.name)
    .replace(/\{title\}/g, vars.title)
    .replace(/\{email\}/g, vars.email);
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: input.smtp.host,
    port: input.smtp.port,
    secure: input.smtp.port === 465,
    auth: {
      user: input.smtp.user,
      pass: input.smtp.pass,
    },
  });

  let html = wrapBodyInHtml(input.body, input.signature);
  html = rewriteLinks(html, input.emailId, input.appUrl, input.campaignName);
  html = injectTrackingPixel(html, input.emailId, input.appUrl);

  await transporter.sendMail({
    from: `"${input.fromName}" <${input.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html,
  });
}
