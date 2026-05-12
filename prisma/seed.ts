import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcryptjs from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcryptjs.hash("pivothire2026", 10);

  const kevin = await prisma.user.upsert({
    where: { email: "kevin.zhong@pivothire.tech" },
    update: {},
    create: {
      email: "kevin.zhong@pivothire.tech",
      password: passwordHash,
      name: "Kevin Zhong",
      title: "CEO",
    },
  });

  await prisma.user.upsert({
    where: { email: "joshua.chen@pivothire.tech" },
    update: {},
    create: {
      email: "joshua.chen@pivothire.tech",
      password: passwordHash,
      name: "Joshua Chen",
      title: "CTO",
    },
  });

  await prisma.template.upsert({
    where: { id: "base-template" },
    update: {},
    create: {
      id: "base-template",
      name: "Base Template",
      type: "BASE",
      content: `You are writing a cold outreach email on behalf of PivotHire, an AI-driven outsourcing platform that connects businesses with vetted engineering talent from China.

Key value props:
- Access to rigorously vetted engineers specializing in ML/AI, full-stack, and mobile development
- AI-managed project delivery with automated code review and timeline management
- Cross-border compliance, IP protection, and escrow-based payment built in
- Faster and more cost-effective than traditional hiring or freelance platforms

Tone: Professional but warm. Direct, not salesy. Show you understand their specific situation.
Write in English. Keep subject lines under 60 characters. Keep body under 150 words.
Output JSON: { "subject": "...", "body": "..." }
The body should be plain text (no HTML). Use \\n for line breaks.`,
      createdById: kevin.id,
    },
  });

  await prisma.template.upsert({
    where: { id: "segment-startup" },
    update: {},
    create: {
      id: "segment-startup",
      name: "Startup Segment",
      type: "SEGMENT",
      segment: "STARTUP",
      content: `This email targets a startup. Emphasize:
- Speed: get engineers onboarded in days, not months
- Flexibility: scale team up/down as needed
- Cost: fraction of US hiring costs without sacrificing quality
- Focus on their core product while we handle engineering capacity`,
      createdById: kevin.id,
    },
  });

  await prisma.template.upsert({
    where: { id: "segment-traditional" },
    update: {},
    create: {
      id: "segment-traditional",
      name: "Traditional Enterprise Segment",
      type: "SEGMENT",
      segment: "TRADITIONAL",
      content: `This email targets a traditional enterprise looking to digitize. Emphasize:
- Digital transformation expertise: modernize legacy systems
- Reliability: managed delivery with milestones and guarantees
- Long-term partnership: dedicated team that learns your business
- ROI: concrete examples of cost savings from modernization`,
      createdById: kevin.id,
    },
  });

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
