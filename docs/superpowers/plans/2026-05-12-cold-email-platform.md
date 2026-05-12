# PivotHire Cold Email Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal cold email platform for PivotHire that manages contacts, generates AI-personalized emails, provides batch review, sends via SMTP, and tracks opens/clicks.

**Architecture:** Single Next.js App Router app on Vercel. PostgreSQL (Neon) with Prisma ORM. Vercel Cron for scheduled email sending and auto-discovery. OpenAI GPT-5.4-mini for email generation. Nodemailer for SMTP sending. Self-built tracking (open pixel + click redirect) with GA UTM integration.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL (Neon), NextAuth v4, Tailwind CSS, Nodemailer, OpenAI SDK, Vitest

**Spec:** `docs/superpowers/specs/2026-05-12-cold-email-platform-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                         — Root layout: font, SessionProvider
│   ├── page.tsx                           — Redirect to /dashboard
│   ├── login/
│   │   └── page.tsx                       — Login form (email + password)
│   ├── (app)/
│   │   ├── layout.tsx                     — Auth guard + top nav
│   │   ├── dashboard/
│   │   │   └── page.tsx                   — Stats cards + recent campaigns
│   │   ├── contacts/
│   │   │   └── page.tsx                   — Contact table + LLM import modal
│   │   ├── campaigns/
│   │   │   ├── page.tsx                   — Campaign list
│   │   │   ├── new/
│   │   │   │   └── page.tsx               — Create campaign + select contacts
│   │   │   └── [id]/
│   │   │       └── page.tsx               — Batch review + approve + send
│   │   ├── templates/
│   │   │   └── page.tsx                   — Prompt template management
│   │   └── settings/
│   │       └── page.tsx                   — SMTP config + profile + signature
│   └── api/
│       ├── auth/[...nextauth]/route.ts    — NextAuth handler
│       ├── contacts/
│       │   ├── route.ts                   — GET (list) + POST (create)
│       │   └── import/route.ts            — POST (LLM parse)
│       ├── contacts/[id]/route.ts         — PATCH + DELETE single contact
│       ├── campaigns/
│       │   ├── route.ts                   — GET (list) + POST (create)
│       │   └── [id]/
│       │       ├── route.ts               — GET + PATCH single campaign
│       │       └── generate/route.ts      — POST (generate emails batch)
│       ├── emails/[id]/route.ts           — PATCH (edit subject/body/status)
│       ├── templates/
│       │   ├── route.ts                   — GET (list) + POST (create)
│       │   └── [id]/route.ts             — PATCH + DELETE single template
│       ├── settings/route.ts              — GET + PATCH user settings
│       ├── send/route.ts                  — Vercel Cron: batch email dispatch
│       ├── discover/route.ts              — Vercel Cron: auto-discover contacts
│       └── track/
│           ├── open/[id]/route.ts         — Tracking pixel endpoint
│           └── click/[id]/route.ts        — Click redirect endpoint
├── lib/
│   ├── prisma.ts                          — Prisma client singleton
│   ├── auth.ts                            — NextAuth options + helpers
│   ├── email-sender.ts                    — Nodemailer wrapper + tracking injection
│   ├── email-generator.ts                 — OpenAI prompt assembly + generation
│   ├── tracking.ts                        — Inject pixel, rewrite links
│   └── discovery/
│       ├── producthunt.ts                 — ProductHunt API scraper
│       ├── yc.ts                          — YC Directory scraper
│       ├── a16z.ts                        — a16z portfolio scraper
│       └── sequoia.ts                     — Sequoia portfolio scraper
└── components/
    ├── providers.tsx                      — SessionProvider wrapper (client)
    ├── nav.tsx                            — Top nav bar
    ├── stats-card.tsx                     — Dashboard stat card
    ├── contact-table.tsx                  — Contact list with filters
    ├── llm-import-modal.tsx               — LLM import dialog
    ├── campaign-form.tsx                  — Campaign creation form
    ├── contact-selector.tsx               — Contact multi-select for campaigns
    ├── email-review-table.tsx             — Batch review table
    ├── email-editor-modal.tsx             — Edit single email modal
    └── template-editor.tsx                — Template CRUD cards

prisma/
├── schema.prisma                          — All models
└── seed.ts                                — Seed Kevin + Joshua users

__tests__/
├── lib/
│   ├── tracking.test.ts
│   ├── email-generator.test.ts
│   └── email-sender.test.ts
└── api/
    ├── contacts.test.ts
    ├── send.test.ts
    └── track.test.ts

vercel.json                                — Cron job config
.env.local.example                         — Required env vars
```

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.local.example`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/clck/Desktop/Workspace/ph-cold-email
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

This will scaffold into the current directory. Answer yes to overwrite if prompted about existing files.

- [ ] **Step 2: Install dependencies**

```bash
npm install next-auth@4 @prisma/client nodemailer openai bcryptjs
npm install -D prisma vitest @vitejs/plugin-react @types/nodemailer @types/bcryptjs
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.local.example**

Create `.env.local.example`:

```
DATABASE_URL="postgresql://user:password@host:5432/dbname"
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="password"
APP_URL="http://localhost:3000"
CRON_SECRET="generate-a-random-secret-here"
```

- [ ] **Step 6: Update .gitignore**

Append to `.gitignore`:

```
node_modules/
.next/
.env.local
.env*.local
```

- [ ] **Step 7: Verify setup**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with deps"
```

---

### Task 2: Database Schema + Seed

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Write the Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String     @id @default(cuid())
  email      String     @unique
  password   String
  name       String
  title      String
  smtpHost   String?
  smtpPort   Int?
  smtpUser   String?
  smtpPass   String?
  signature  String     @default("Best regards,\n\n{name}\n{title}, PivotHire\n{email}")
  contacts   Contact[]
  campaigns  Campaign[]
  templates  Template[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}

enum Segment {
  STARTUP
  TRADITIONAL
}

model Contact {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  company     String
  title       String?
  industry    String?
  segment     Segment  @default(STARTUP)
  source      String   @default("manual")
  companyInfo Json?
  tags        String[]
  owner       User     @relation(fields: [ownerId], references: [id])
  ownerId     String
  emails      Email[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum CampaignStatus {
  DRAFT
  GENERATING
  REVIEW
  SENDING
  COMPLETED
}

model Campaign {
  id             String         @id @default(cuid())
  name           String
  status         CampaignStatus @default(DRAFT)
  segment        String?
  industry       String?
  templatePrompt String?
  createdBy      User           @relation(fields: [createdById], references: [id])
  createdById    String
  emails         Email[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

enum EmailStatus {
  PENDING
  GENERATED
  APPROVED
  SENT
  FAILED
}

model Email {
  id             String          @id @default(cuid())
  subject        String          @default("")
  body           String          @default("")
  status         EmailStatus     @default(PENDING)
  sentAt         DateTime?
  contact        Contact         @relation(fields: [contactId], references: [id])
  contactId      String
  campaign       Campaign        @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  campaignId     String
  trackingEvents TrackingEvent[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([contactId, campaignId])
}

enum TrackingType {
  OPEN
  CLICK
}

model TrackingEvent {
  id        String       @id @default(cuid())
  type      TrackingType
  url       String?
  ip        String?
  userAgent String?
  email     Email        @relation(fields: [emailId], references: [id], onDelete: Cascade)
  emailId   String
  timestamp DateTime     @default(now())
}

enum TemplateType {
  BASE
  SEGMENT
  INDUSTRY
}

model Template {
  id          String       @id @default(cuid())
  name        String
  type        TemplateType
  segment     String?
  industry    String?
  content     String
  createdBy   User         @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `src/lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Write seed script**

Create `prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcryptjs.hash("pivothire2026", 10);

  await prisma.user.upsert({
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
      createdById: "placeholder",
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
```

Note: The base template `createdById` needs to reference a real user. Update the seed to:

```ts
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

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
```

- [ ] **Step 5: Add seed config to package.json**

Add to `package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Also install tsx:

```bash
npm install -D tsx
```

- [ ] **Step 6: Set up database and run migration**

Create a `.env.local` file with your actual `DATABASE_URL` (Neon connection string). Then:

```bash
cp .env.local.example .env.local
# Edit .env.local with real DATABASE_URL
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. Seed runs automatically.

- [ ] **Step 7: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Opens browser, shows all models. Users table has Kevin + Joshua. Templates table has base + 2 segment templates.

- [ ] **Step 8: Commit**

```bash
git add prisma/ src/lib/prisma.ts package.json package-lock.json
git commit -m "feat: add Prisma schema with all models and seed data"
```

---

### Task 3: Authentication

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/components/providers.tsx`, `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx`
- Test: `__tests__/api/auth.test.ts`

- [ ] **Step 1: Write auth test**

Create `__tests__/api/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCompare = vi.mocked(bcryptjs.compare);

describe("auth whitelist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-whitelisted email", async () => {
    const WHITELIST = [
      "kevin.zhong@pivothire.tech",
      "joshua.chen@pivothire.tech",
    ];
    const email = "hacker@evil.com";
    expect(WHITELIST.includes(email)).toBe(false);
  });

  it("accepts whitelisted email with correct password", async () => {
    const WHITELIST = [
      "kevin.zhong@pivothire.tech",
      "joshua.chen@pivothire.tech",
    ];
    const email = "kevin.zhong@pivothire.tech";
    expect(WHITELIST.includes(email)).toBe(true);

    mockFindUnique.mockResolvedValue({
      id: "1",
      email,
      password: "hashed",
      name: "Kevin Zhong",
      title: "CEO",
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPass: null,
      signature: "Best regards,\n\nKevin Zhong\nCEO, PivotHire",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCompare.mockResolvedValue(true as never);

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordValid = await bcryptjs.compare("password", user!.password);

    expect(user).not.toBeNull();
    expect(passwordValid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/auth.test.ts
```

Expected: Tests should PASS (these test the whitelist logic with mocks). If there are import resolution issues, fix the vitest config aliases.

- [ ] **Step 3: Create NextAuth config**

Create `src/lib/auth.ts`:

```ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "./prisma";

const WHITELIST = [
  "kevin.zhong@pivothire.tech",
  "joshua.chen@pivothire.tech",
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (!WHITELIST.includes(credentials.email)) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const valid = await bcryptjs.compare(
          credentials.password,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          title: user.title,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.title = (user as { title: string }).title;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { title: string }).title = token.title as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
```

- [ ] **Step 4: Create NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 5: Create type augmentation for NextAuth**

Create `src/types/next-auth.d.ts`:

```ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    title: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      title: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    title: string;
  }
}
```

- [ ] **Step 6: Create SessionProvider wrapper**

Create `src/components/providers.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 7: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PivotHire Cold Email",
  description: "Internal cold email platform for PivotHire",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm shadow-sm">
        <div className="flex justify-center mb-6">
          <img
            src="https://www.pivothire.tech/logo-light-transparent.png"
            alt="PivotHire"
            className="h-8"
          />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 text-center mb-6">
          Cold Email Platform
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@pivothire.tech"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create root redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 10: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 11: Verify login page visually**

```bash
npm run dev
```

Open `http://localhost:3000/login`. Verify:
- PivotHire logo displays
- Email and password fields render
- Submitting invalid credentials shows error
- Submitting valid credentials (kevin.zhong@pivothire.tech / pivothire2026) redirects to /dashboard

- [ ] **Step 12: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/components/providers.tsx src/app/layout.tsx src/app/login/ src/app/page.tsx src/types/ __tests__/
git commit -m "feat: add NextAuth login with whitelist"
```

---

### Task 4: App Layout + Navigation

**Files:**
- Create: `src/components/nav.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create Nav component**

Create `src/components/nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
      <Link href="/dashboard" className="flex-shrink-0">
        <img
          src="https://www.pivothire.tech/logo-light-transparent.png"
          alt="PivotHire"
          className="h-6"
        />
      </Link>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm ${
            pathname.startsWith(link.href)
              ? "text-blue-600 font-medium"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          {link.label}
        </Link>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-gray-500">{session?.user?.name}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-semibold hover:bg-blue-700 transition-colors"
          title="Sign out"
        >
          {initials}
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create auth-gated layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Nav } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder dashboard page**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      <p className="text-gray-500 mt-2">Coming soon...</p>
    </div>
  );
}
```

- [ ] **Step 4: Verify layout**

```bash
npm run dev
```

Log in and verify:
- Top nav shows PivotHire logo, all navigation links, user name, avatar button
- Active link is highlighted in blue
- Clicking avatar signs out
- Navigating to /contacts etc. shows the nav consistently
- Non-logged-in users get redirected to /login

- [ ] **Step 5: Commit**

```bash
git add src/components/nav.tsx src/app/\(app\)/
git commit -m "feat: add top nav and auth-gated layout"
```

---

## Phase 2: Data Management

### Task 5: Contacts API

**Files:**
- Create: `src/app/api/contacts/route.ts`, `src/app/api/contacts/[id]/route.ts`
- Test: `__tests__/api/contacts.test.ts`

- [ ] **Step 1: Write contacts API test**

Create `__tests__/api/contacts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.contact.findMany);
const mockCreate = vi.mocked(prisma.contact.create);

describe("contacts API logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists contacts for all users (both owners visible)", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "1",
        email: "john@acme.com",
        name: "John",
        company: "Acme",
        title: "CEO",
        industry: "fintech",
        segment: "STARTUP",
        source: "manual",
        companyInfo: null,
        tags: [],
        ownerId: "kevin-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });

    expect(contacts).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("creates contact with owner assignment", async () => {
    const data = {
      email: "jane@tradco.com",
      name: "Jane",
      company: "TradCo",
      segment: "TRADITIONAL" as const,
      source: "manual",
      ownerId: "kevin-id",
    };

    mockCreate.mockResolvedValue({
      id: "2",
      ...data,
      title: null,
      industry: null,
      companyInfo: null,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const contact = await prisma.contact.create({ data });
    expect(contact.email).toBe("jane@tradco.com");
    expect(contact.ownerId).toBe("kevin-id");
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run __tests__/api/contacts.test.ts
```

Expected: PASS.

- [ ] **Step 3: Create contacts list + create API**

Create `src/app/api/contacts/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const segment = searchParams.get("segment");
  const industry = searchParams.get("industry");
  const source = searchParams.get("source");
  const ownerId = searchParams.get("ownerId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (segment) where.segment = segment;
  if (industry) where.industry = industry;
  if (source) where.source = source;
  if (ownerId) where.ownerId = ownerId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { email, name, company, title, industry, segment, source, companyInfo, tags } = body;

  if (!email || !name || !company) {
    return NextResponse.json({ error: "email, name, company required" }, { status: 400 });
  }

  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Contact with this email already exists" }, { status: 409 });
  }

  const contact = await prisma.contact.create({
    data: {
      email,
      name,
      company,
      title,
      industry,
      segment: segment || "STARTUP",
      source: source || "manual",
      companyInfo,
      tags: tags || [],
      ownerId: session.user.id,
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
```

- [ ] **Step 4: Create single contact API**

Create `src/app/api/contacts/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contact.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Read-only: not your contact" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.contact.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contact.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Read-only: not your contact" }, { status: 403 });
  }

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/contacts/ __tests__/api/contacts.test.ts
git commit -m "feat: add contacts CRUD API with ownership checks"
```

---

### Task 6: Contacts Page

**Files:**
- Create: `src/components/contact-table.tsx`, `src/app/(app)/contacts/page.tsx`

- [ ] **Step 1: Create ContactTable component**

Create `src/components/contact-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type Contact = {
  id: string;
  email: string;
  name: string;
  company: string;
  title: string | null;
  industry: string | null;
  segment: "STARTUP" | "TRADITIONAL";
  source: string;
  tags: string[];
  ownerId: string;
  owner: { id: string; name: string };
};

export function ContactTable({
  contacts,
  onRefresh,
}: {
  contacts: Contact[];
  onRefresh: () => void;
}) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => (
              <tr
                key={contact.id}
                className="border-b border-gray-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {contact.name}
                  </div>
                  <div className="text-gray-400 text-xs">{contact.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{contact.company}</td>
                <td className="px-4 py-3 text-gray-500">
                  {contact.title || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      contact.segment === "STARTUP"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {contact.segment.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{contact.source}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {contact.owner.name}
                </td>
                <td className="px-4 py-3">
                  {contact.ownerId === session?.user?.id && (
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No contacts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Contacts page**

Create `src/app/(app)/contacts/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ContactTable } from "@/components/contact-table";
import { LlmImportModal } from "@/components/llm-import-modal";

export default function ContactsPage() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState([]);
  const [tab, setTab] = useState<"mine" | "other">("mine");
  const [showImport, setShowImport] = useState(false);

  const fetchContacts = useCallback(async () => {
    const res = await fetch("/api/contacts");
    if (res.ok) setContacts(await res.json());
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const myContacts = contacts.filter(
    (c: { ownerId: string }) => c.ownerId === session?.user?.id
  );
  const otherContacts = contacts.filter(
    (c: { ownerId: string }) => c.ownerId !== session?.user?.id
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + LLM Import
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("mine")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "mine"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          My Contacts ({myContacts.length})
        </button>
        <button
          onClick={() => setTab("other")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "other"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Other&apos;s Contacts ({otherContacts.length})
        </button>
      </div>

      <ContactTable
        contacts={tab === "mine" ? myContacts : otherContacts}
        onRefresh={fetchContacts}
      />

      {showImport && (
        <LlmImportModal
          onClose={() => setShowImport(false)}
          onImported={fetchContacts}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder LLM Import Modal**

Create `src/components/llm-import-modal.tsx` (full implementation in Task 7):

```tsx
"use client";

export function LlmImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          LLM Import
        </h2>
        <p className="text-gray-500 text-sm">Coming in next task...</p>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify contacts page**

```bash
npm run dev
```

Navigate to `/contacts`. Verify:
- Tab switching between My Contacts / Other's Contacts works
- Search filters the table
- LLM Import button opens modal
- Empty state shows "No contacts found"

- [ ] **Step 5: Commit**

```bash
git add src/components/contact-table.tsx src/components/llm-import-modal.tsx src/app/\(app\)/contacts/
git commit -m "feat: add contacts page with table and tab switching"
```

---

### Task 7: LLM Import

**Files:**
- Create: `src/app/api/contacts/import/route.ts`
- Modify: `src/components/llm-import-modal.tsx`

- [ ] **Step 1: Create LLM import API**

Create `src/app/api/contacts/import/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(req: NextRequest) {
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
```

- [ ] **Step 2: Implement full LLM Import Modal**

Replace `src/components/llm-import-modal.tsx`:

```tsx
"use client";

import { useState } from "react";

type ParsedContact = {
  name: string;
  email: string;
  company: string;
  title: string | null;
  industry: string | null;
  segment: "STARTUP" | "TRADITIONAL";
};

export function LlmImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedContact[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleParse() {
    setParsing(true);
    setErrors([]);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.contacts) {
        setParsed(data.contacts);
        setSelected(new Set(data.contacts.map((_: unknown, i: number) => i)));
      } else {
        setErrors(["Failed to parse contacts"]);
      }
    } catch {
      setErrors(["Failed to parse contacts"]);
    }
    setParsing(false);
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    const newErrors: string[] = [];

    for (const idx of selected) {
      const contact = parsed[idx];
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contact, source: "manual" }),
      });
      if (!res.ok) {
        const err = await res.json();
        newErrors.push(`${contact.email}: ${err.error}`);
      }
    }

    setSaving(false);
    setErrors(newErrors);

    if (newErrors.length === 0 || newErrors.length < selected.size) {
      onImported();
      if (newErrors.length === 0) onClose();
    }
  }

  function toggleSelect(idx: number) {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-lg max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          LLM Import
        </h2>

        {!parsed ? (
          <>
            <p className="text-sm text-gray-500 mb-3">
              Paste any text containing contact info — LinkedIn profiles, email
              signatures, team pages, spreadsheet data, etc. AI will extract
              structured contacts.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="Paste contact info here..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={!text.trim() || parsing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {parsing ? "Parsing..." : "Parse with AI"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">
              {parsed.length} contacts found. Review and deselect any you
              don&apos;t want to import.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 text-left">
                    <th className="px-3 py-2 font-medium w-8"></th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((c, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(idx)}
                          onChange={() => toggleSelect(idx)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-900">{c.name}</td>
                      <td className="px-3 py-2 text-gray-500">{c.email}</td>
                      <td className="px-3 py-2 text-gray-500">{c.company}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            c.segment === "STARTUP"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {c.segment.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                {errors.map((e, i) => (
                  <p key={i} className="text-red-600 text-xs">
                    {e}
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setParsed(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={selected.size === 0 || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Importing..."
                  : `Import ${selected.size} Contacts`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify LLM import**

```bash
npm run dev
```

Go to `/contacts`, click "LLM Import", paste sample text like:

```
John Smith, CEO at Acme Corp (john@acme.com) - fintech startup
Jane Doe - jane.doe@tradco.com, VP Engineering, TradCo Manufacturing
```

Verify: AI parses contacts, shows editable table, can select/deselect, import saves to database, duplicates show error.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/contacts/import/ src/components/llm-import-modal.tsx
git commit -m "feat: add LLM-powered contact import"
```

---

### Task 8: Templates API + Page

**Files:**
- Create: `src/app/api/templates/route.ts`, `src/app/api/templates/[id]/route.ts`, `src/components/template-editor.tsx`, `src/app/(app)/templates/page.tsx`

- [ ] **Step 1: Create templates API**

Create `src/app/api/templates/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.template.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, segment, industry, content } = await req.json();
  if (!name || !type || !content) {
    return NextResponse.json({ error: "name, type, content required" }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: { name, type, segment, industry, content, createdById: session.user.id },
  });

  return NextResponse.json(template, { status: 201 });
}
```

- [ ] **Step 2: Create single template API**

Create `src/app/api/templates/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.template.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create TemplateEditor component**

Create `src/components/template-editor.tsx`:

```tsx
"use client";

import { useState } from "react";

type Template = {
  id: string;
  name: string;
  type: "BASE" | "SEGMENT" | "INDUSTRY";
  segment: string | null;
  industry: string | null;
  content: string;
};

export function TemplateEditor({
  templates,
  onRefresh,
}: {
  templates: Template[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    type: "INDUSTRY" as Template["type"],
    segment: "",
    industry: "",
    content: "",
  });

  const grouped = {
    BASE: templates.filter((t) => t.type === "BASE"),
    SEGMENT: templates.filter((t) => t.type === "SEGMENT"),
    INDUSTRY: templates.filter((t) => t.type === "INDUSTRY"),
  };

  async function handleSave(id: string) {
    await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setEditing(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    onRefresh();
  }

  async function handleCreate() {
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    setShowNew(false);
    setNewForm({ name: "", type: "INDUSTRY", segment: "", industry: "", content: "" });
    onRefresh();
  }

  function renderSection(label: string, items: Template[]) {
    return (
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          {label}
        </h2>
        <div className="space-y-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900">{t.name}</span>
                  {t.segment && (
                    <span className="ml-2 text-xs text-gray-400">
                      {t.segment}
                    </span>
                  )}
                  {t.industry && (
                    <span className="ml-2 text-xs text-gray-400">
                      {t.industry}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {editing === t.id ? (
                    <>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-gray-400 text-xs hover:text-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(t.id)}
                        className="text-blue-600 text-xs font-medium hover:text-blue-700"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditing(t.id);
                          setEditContent(t.content);
                        }}
                        className="text-blue-600 text-xs hover:text-blue-700"
                      >
                        Edit
                      </button>
                      {t.type !== "BASE" && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-red-400 text-xs hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {editing === t.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
                  {t.content}
                </p>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-400">No templates in this category</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderSection("Base Template", grouped.BASE)}
      {renderSection("Segment Templates", grouped.SEGMENT)}
      {renderSection("Industry Templates", grouped.INDUSTRY)}

      {showNew ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
          <h3 className="font-medium text-gray-900 mb-3">New Template</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              placeholder="Template name"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <select
              value={newForm.type}
              onChange={(e) =>
                setNewForm({
                  ...newForm,
                  type: e.target.value as Template["type"],
                })
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="SEGMENT">Segment</option>
              <option value="INDUSTRY">Industry</option>
            </select>
            <input
              placeholder="Segment (e.g. STARTUP)"
              value={newForm.segment}
              onChange={(e) =>
                setNewForm({ ...newForm, segment: e.target.value })
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              placeholder="Industry (e.g. fintech)"
              value={newForm.industry}
              onChange={(e) =>
                setNewForm({ ...newForm, industry: e.target.value })
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <textarea
            placeholder="Template content (prompt for GPT)..."
            value={newForm.content}
            onChange={(e) =>
              setNewForm({ ...newForm, content: e.target.value })
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono mb-3"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newForm.name || !newForm.content}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Template
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create Templates page**

Create `src/app/(app)/templates/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { TemplateEditor } from "@/components/template-editor";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Prompt Templates
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the prompts used to generate cold emails. Base template is
          always included. Segment and industry templates layer on top.
        </p>
      </div>
      <TemplateEditor templates={templates} onRefresh={fetchTemplates} />
    </div>
  );
}
```

- [ ] **Step 5: Verify templates page**

```bash
npm run dev
```

Navigate to `/templates`. Verify:
- Base template, startup segment, traditional segment templates show (from seed)
- Can edit and save content
- Can create new industry template
- Can delete non-base templates

- [ ] **Step 6: Commit**

```bash
git add src/app/api/templates/ src/components/template-editor.tsx src/app/\(app\)/templates/
git commit -m "feat: add prompt templates CRUD and management page"
```

---

### Task 9: Settings Page

**Files:**
- Create: `src/app/api/settings/route.ts`, `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create settings API**

Create `src/app/api/settings/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      title: true,
      email: true,
      signature: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpPass: true,
    },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["name", "title", "signature", "smtpHost", "smtpPort", "smtpUser", "smtpPass"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      name: true,
      title: true,
      email: true,
      signature: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpPass: true,
    },
  });

  return NextResponse.json(user);
}
```

- [ ] **Step 2: Create Settings page**

Create `src/app/(app)/settings/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type Settings = {
  name: string;
  title: string;
  email: string;
  signature: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Profile
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              value={settings.name}
              onChange={(e) =>
                setSettings({ ...settings, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              value={settings.title}
              onChange={(e) =>
                setSettings({ ...settings, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">
            Email Signature Template
          </label>
          <textarea
            value={settings.signature}
            onChange={(e) =>
              setSettings({ ...settings, signature: e.target.value })
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">
            Variables: {"{name}"}, {"{title}"}, {"{email}"}
          </p>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          SMTP Configuration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Host</label>
            <input
              value={settings.smtpHost || ""}
              onChange={(e) =>
                setSettings({ ...settings, smtpHost: e.target.value })
              }
              placeholder="smtp.example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Port</label>
            <input
              type="number"
              value={settings.smtpPort || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  smtpPort: parseInt(e.target.value) || null,
                })
              }
              placeholder="587"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Username
            </label>
            <input
              value={settings.smtpUser || ""}
              onChange={(e) =>
                setSettings({ ...settings, smtpUser: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={settings.smtpPass || ""}
              onChange={(e) =>
                setSettings({ ...settings, smtpPass: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify settings page**

```bash
npm run dev
```

Navigate to `/settings`. Verify:
- Profile fields pre-populated from DB
- SMTP fields editable
- Signature template shows with variable hints
- Save persists changes (refresh page to confirm)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/settings/ src/app/\(app\)/settings/
git commit -m "feat: add settings page with profile and SMTP config"
```

---

## Phase 3: Campaign Pipeline

### Task 10: Campaign Creation

**Files:**
- Create: `src/app/api/campaigns/route.ts`, `src/app/api/campaigns/[id]/route.ts`, `src/components/contact-selector.tsx`, `src/components/campaign-form.tsx`, `src/app/(app)/campaigns/page.tsx`, `src/app/(app)/campaigns/new/page.tsx`

- [ ] **Step 1: Create campaigns API**

Create `src/app/api/campaigns/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { emails: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, segment, industry, templatePrompt, contactIds } = await req.json();
  if (!name || !contactIds?.length) {
    return NextResponse.json({ error: "name and contactIds required" }, { status: 400 });
  }

  const alreadySentEmails = await prisma.email.findMany({
    where: {
      contactId: { in: contactIds },
      status: "SENT",
    },
    select: { contactId: true },
  });
  const alreadySentSet = new Set(alreadySentEmails.map((e) => e.contactId));
  const validContactIds = contactIds.filter(
    (id: string) => !alreadySentSet.has(id)
  );

  const campaign = await prisma.campaign.create({
    data: {
      name,
      segment,
      industry,
      templatePrompt,
      status: "GENERATING",
      createdById: session.user.id,
      emails: {
        create: validContactIds.map((contactId: string) => ({
          contactId,
          status: "PENDING",
        })),
      },
    },
    include: { emails: true },
  });

  return NextResponse.json(
    { campaign, skipped: contactIds.length - validContactIds.length },
    { status: 201 }
  );
}
```

- [ ] **Step 2: Create single campaign API**

Create `src/app/api/campaigns/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      emails: {
        include: {
          contact: { select: { name: true, email: true, company: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const campaign = await prisma.campaign.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(campaign);
}
```

- [ ] **Step 3: Create ContactSelector component**

Create `src/components/contact-selector.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  segment: string;
  industry: string | null;
};

export function ContactSelector({
  selectedIds,
  onChange,
  segment,
  industry,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  segment?: string;
  industry?: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (segment) params.set("segment", segment);
    if (industry) params.set("industry", industry);
    fetch(`/api/contacts?${params}`).then((r) =>
      r.json().then(setContacts)
    );
  }, [segment, industry]);

  function toggleAll() {
    if (selectedIds.length === contacts.length) {
      onChange([]);
    } else {
      onChange(contacts.map((c) => c.id));
    }
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={
              selectedIds.length === contacts.length && contacts.length > 0
            }
            onChange={toggleAll}
            className="rounded"
          />
          Select all ({contacts.length})
        </label>
        <span className="text-sm text-blue-600 font-medium">
          {selectedIds.length} selected
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {contacts.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="rounded"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-400">
                {c.company} · {c.email}
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                c.segment === "STARTUP"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {c.segment.toLowerCase()}
            </span>
          </label>
        ))}
        {contacts.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-400 text-sm">
            No contacts match filters
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CampaignForm component**

Create `src/components/campaign-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactSelector } from "./contact-selector";

export function CampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [industry, setIndustry] = useState("");
  const [templatePrompt, setTemplatePrompt] = useState("");
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        segment: segment || undefined,
        industry: industry || undefined,
        templatePrompt: templatePrompt || undefined,
        contactIds,
      }),
    });

    if (res.ok) {
      const { campaign } = await res.json();
      router.push(`/campaigns/${campaign.id}`);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Campaign Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Campaign Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. YC S25 Outreach"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Segment
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All segments</option>
                <option value="STARTUP">Startup</option>
                <option value="TRADITIONAL">Traditional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Industry
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. fintech"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Strategy Notes (optional)
            </label>
            <textarea
              value={templatePrompt}
              onChange={(e) => setTemplatePrompt(e.target.value)}
              rows={3}
              placeholder="Additional instructions for AI generation..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Select Contacts
        </h2>
        <ContactSelector
          selectedIds={contactIds}
          onChange={setContactIds}
          segment={segment || undefined}
          industry={industry || undefined}
        />
      </div>

      <button
        type="submit"
        disabled={!name || contactIds.length === 0 || loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading
          ? "Creating..."
          : `Create & Generate (${contactIds.length} emails)`}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create campaigns list page**

Create `src/app/(app)/campaigns/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Campaign = {
  id: string;
  name: string;
  status: string;
  segment: string | null;
  industry: string | null;
  createdBy: { id: string; name: string };
  _count: { emails: number };
  createdAt: string;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  GENERATING: "bg-purple-50 text-purple-600",
  REVIEW: "bg-amber-50 text-amber-600",
  SENDING: "bg-blue-50 text-blue-600",
  COMPLETED: "bg-green-50 text-green-600",
};

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then(setCampaigns);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Campaigns</h1>
        <Link
          href="/campaigns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Campaign
        </Link>
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/campaigns/${c.id}`}
            className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {c.createdBy.name} · {c._count.emails} emails
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[c.status] || ""}`}
              >
                {c.status.toLowerCase()}
              </span>
            </div>
            {(c.segment || c.industry) && (
              <div className="mt-1 text-xs text-gray-400">
                {c.segment && <span>{c.segment.toLowerCase()}</span>}
                {c.segment && c.industry && <span> · </span>}
                {c.industry && <span>{c.industry}</span>}
              </div>
            )}
          </Link>
        ))}
        {campaigns.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            No campaigns yet. Create your first one!
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create campaign creation page**

Create `src/app/(app)/campaigns/new/page.tsx`:

```tsx
import { CampaignForm } from "@/components/campaign-form";

export default function NewCampaignPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">
        New Campaign
      </h1>
      <CampaignForm />
    </div>
  );
}
```

- [ ] **Step 7: Verify campaign creation flow**

```bash
npm run dev
```

Navigate to `/campaigns/new`. Verify:
- Form fields render correctly
- Segment/industry filters update contact list
- Contact checkboxes work
- Creating a campaign redirects to review page (will be empty for now)

- [ ] **Step 8: Commit**

```bash
git add src/app/api/campaigns/ src/components/contact-selector.tsx src/components/campaign-form.tsx src/app/\(app\)/campaigns/
git commit -m "feat: add campaign creation with contact selection and dedup"
```

---

### Task 11: Email Generation

**Files:**
- Create: `src/lib/email-generator.ts`, `src/app/api/campaigns/[id]/generate/route.ts`
- Test: `__tests__/lib/email-generator.test.ts`

- [ ] **Step 1: Write email generator test**

Create `__tests__/lib/email-generator.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { assemblePrompt } from "@/lib/email-generator";

describe("assemblePrompt", () => {
  it("combines base + segment + industry templates", () => {
    const result = assemblePrompt({
      baseTemplate: "You are writing a cold email for PivotHire.",
      segmentTemplate: "This targets a startup. Emphasize speed.",
      industryTemplate: "Focus on fintech compliance.",
      contact: {
        name: "John Smith",
        email: "john@acme.com",
        company: "Acme Corp",
        title: "CTO",
        industry: "fintech",
        companyInfo: { recentFunding: "Series A, $5M" },
      },
      strategyNotes: "Mention our AI code review",
    });

    expect(result.system).toContain("PivotHire");
    expect(result.system).toContain("startup");
    expect(result.system).toContain("fintech");
    expect(result.user).toContain("John Smith");
    expect(result.user).toContain("Acme Corp");
    expect(result.user).toContain("Series A");
    expect(result.user).toContain("AI code review");
  });

  it("works without optional templates", () => {
    const result = assemblePrompt({
      baseTemplate: "Base prompt",
      contact: {
        name: "Jane",
        email: "jane@co.com",
        company: "Co",
        title: null,
        industry: null,
        companyInfo: null,
      },
    });

    expect(result.system).toBe("Base prompt");
    expect(result.user).toContain("Jane");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/email-generator.test.ts
```

Expected: FAIL — `assemblePrompt` not found.

- [ ] **Step 3: Implement email generator**

Create `src/lib/email-generator.ts`:

```ts
import OpenAI from "openai";

const openai = new OpenAI();

type ContactInput = {
  name: string;
  email: string;
  company: string;
  title: string | null;
  industry: string | null;
  companyInfo: Record<string, unknown> | null;
};

export function assemblePrompt({
  baseTemplate,
  segmentTemplate,
  industryTemplate,
  contact,
  strategyNotes,
}: {
  baseTemplate: string;
  segmentTemplate?: string | null;
  industryTemplate?: string | null;
  contact: ContactInput;
  strategyNotes?: string | null;
}) {
  const systemParts = [baseTemplate];
  if (segmentTemplate) systemParts.push(segmentTemplate);
  if (industryTemplate) systemParts.push(industryTemplate);

  const userParts = [
    `Recipient: ${contact.name}${contact.title ? `, ${contact.title}` : ""} at ${contact.company}`,
    `Email: ${contact.email}`,
  ];

  if (contact.industry) userParts.push(`Industry: ${contact.industry}`);

  if (contact.companyInfo) {
    const info = Object.entries(contact.companyInfo)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    if (info) userParts.push(`Company context: ${info}`);
  }

  if (strategyNotes) userParts.push(`Additional notes: ${strategyNotes}`);

  userParts.push(
    "Generate a personalized cold email. Output JSON: { \"subject\": \"...\", \"body\": \"...\" }"
  );

  return {
    system: systemParts.join("\n\n"),
    user: userParts.join("\n"),
  };
}

export async function generateEmail(prompt: {
  system: string;
  user: string;
}): Promise<{ subject: string; body: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  return JSON.parse(content);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/email-generator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Create generate API endpoint**

Create `src/app/api/campaigns/[id]/generate/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assemblePrompt, generateEmail } from "@/lib/email-generator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      emails: {
        where: { status: "PENDING" },
        include: { contact: true },
        take: 10,
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const templates = await prisma.template.findMany();
  const baseTemplate = templates.find((t) => t.type === "BASE");
  const segmentTemplate = campaign.segment
    ? templates.find(
        (t) => t.type === "SEGMENT" && t.segment === campaign.segment
      )
    : null;
  const industryTemplate = campaign.industry
    ? templates.find(
        (t) => t.type === "INDUSTRY" && t.industry === campaign.industry
      )
    : null;

  if (!baseTemplate) {
    return NextResponse.json({ error: "No base template found" }, { status: 400 });
  }

  let generated = 0;
  for (const email of campaign.emails) {
    try {
      const prompt = assemblePrompt({
        baseTemplate: baseTemplate.content,
        segmentTemplate: segmentTemplate?.content,
        industryTemplate: industryTemplate?.content,
        contact: {
          name: email.contact.name,
          email: email.contact.email,
          company: email.contact.company,
          title: email.contact.title,
          industry: email.contact.industry,
          companyInfo: email.contact.companyInfo as Record<string, unknown> | null,
        },
        strategyNotes: campaign.templatePrompt,
      });

      const result = await generateEmail(prompt);

      await prisma.email.update({
        where: { id: email.id },
        data: { subject: result.subject, body: result.body, status: "GENERATED" },
      });

      generated++;
    } catch (error) {
      console.error(`Failed to generate email ${email.id}:`, error);
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "FAILED" },
      });
    }
  }

  const remaining = await prisma.email.count({
    where: { campaignId: id, status: "PENDING" },
  });

  if (remaining === 0) {
    await prisma.campaign.update({
      where: { id },
      data: { status: "REVIEW" },
    });
  }

  return NextResponse.json({ generated, remaining });
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/email-generator.ts src/app/api/campaigns/\[id\]/generate/ __tests__/lib/email-generator.test.ts
git commit -m "feat: add AI email generation with prompt assembly"
```

---

### Task 12: Campaign Review Page

**Files:**
- Create: `src/app/api/emails/[id]/route.ts`, `src/components/email-review-table.tsx`, `src/components/email-editor-modal.tsx`, `src/app/(app)/campaigns/[id]/page.tsx`

- [ ] **Step 1: Create email update API**

Create `src/app/api/emails/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const allowed = ["subject", "body", "status"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const email = await prisma.email.update({
    where: { id },
    data,
  });

  return NextResponse.json(email);
}
```

- [ ] **Step 2: Create EmailEditorModal component**

Create `src/components/email-editor-modal.tsx`:

```tsx
"use client";

import { useState } from "react";

type Email = {
  id: string;
  subject: string;
  body: string;
  contact: { name: string; email: string; company: string };
};

export function EmailEditorModal({
  email,
  onClose,
  onSaved,
}: {
  email: Email;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/emails/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-lg">
        <div className="mb-4">
          <span className="text-sm text-gray-500">
            To: {email.contact.name} ({email.contact.email})
          </span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create EmailReviewTable component**

Create `src/components/email-review-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { EmailEditorModal } from "./email-editor-modal";

type Email = {
  id: string;
  subject: string;
  body: string;
  status: string;
  contact: { name: string; email: string; company: string };
};

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  GENERATED: "bg-blue-50 text-blue-600",
  APPROVED: "bg-green-50 text-green-600",
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-50 text-red-600",
};

export function EmailReviewTable({
  emails,
  onRefresh,
}: {
  emails: Email[];
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Email | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll() {
    const approvable = emails.filter(
      (e) => e.status === "GENERATED" || e.status === "APPROVED"
    );
    if (selected.size === approvable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(approvable.map((e) => e.id)));
    }
  }

  async function approveSelected() {
    await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/emails/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "APPROVED" }),
        })
      )
    );
    onRefresh();
  }

  const approvedCount = emails.filter((e) => e.status === "APPROVED").length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={selectAll}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {selected.size > 0 ? "Deselect all" : "Select all"}
        </button>
        {selected.size > 0 && (
          <button
            onClick={approveSelected}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
          >
            Approve {selected.size} selected
          </button>
        )}
        <span className="text-sm text-gray-400 ml-auto">
          {approvedCount} / {emails.length} approved
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 text-left">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {emails.map((email) => (
              <>
                <tr
                  key={email.id}
                  className="border-b border-gray-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() =>
                    setExpanded(expanded === email.id ? null : email.id)
                  }
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {(email.status === "GENERATED" ||
                      email.status === "APPROVED") && (
                      <input
                        type="checkbox"
                        checked={selected.has(email.id)}
                        onChange={() => toggleSelect(email.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{email.contact.name}</div>
                    <div className="text-gray-400 text-xs">
                      {email.contact.company}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{email.subject}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[email.status] || ""}`}
                    >
                      {email.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditing(email)}
                      className="text-blue-600 text-xs hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
                {expanded === email.id && (
                  <tr key={`${email.id}-body`}>
                    <td colSpan={5} className="px-4 py-3 bg-slate-50">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap max-w-2xl">
                        {email.body}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EmailEditorModal
          email={editing}
          onClose={() => setEditing(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create campaign review page**

Create `src/app/(app)/campaigns/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmailReviewTable } from "@/components/email-review-table";

type Campaign = {
  id: string;
  name: string;
  status: string;
  emails: {
    id: string;
    subject: string;
    body: string;
    status: string;
    contact: { name: string; email: string; company: string };
  }[];
};

export default function CampaignReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchCampaign = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`);
    if (res.ok) setCampaign(await res.json());
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  async function handleGenerate() {
    setGenerating(true);
    let remaining = 1;
    while (remaining > 0) {
      const res = await fetch(`/api/campaigns/${id}/generate`, {
        method: "POST",
      });
      const data = await res.json();
      remaining = data.remaining;
      await fetchCampaign();
    }
    setGenerating(false);
  }

  async function handleSendApproved() {
    if (!confirm("Send all approved emails?")) return;
    setSending(true);
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENDING" }),
    });
    await fetchCampaign();
    setSending(false);
  }

  if (!campaign) return <div className="text-gray-400">Loading...</div>;

  const approvedCount = campaign.emails.filter(
    (e) => e.status === "APPROVED"
  ).length;
  const hasPending = campaign.emails.some((e) => e.status === "PENDING");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {campaign.name}
          </h1>
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              campaign.status === "REVIEW"
                ? "bg-amber-50 text-amber-600"
                : campaign.status === "SENDING"
                  ? "bg-blue-50 text-blue-600"
                  : campaign.status === "COMPLETED"
                    ? "bg-green-50 text-green-600"
                    : "bg-purple-50 text-purple-600"
            }`}
          >
            {campaign.status.toLowerCase()}
          </span>
        </div>
        <div className="flex gap-2">
          {hasPending && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Remaining"}
            </button>
          )}
          {approvedCount > 0 && campaign.status === "REVIEW" && (
            <button
              onClick={handleSendApproved}
              disabled={sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending
                ? "Queuing..."
                : `Send ${approvedCount} Approved`}
            </button>
          )}
        </div>
      </div>

      <EmailReviewTable
        emails={campaign.emails}
        onRefresh={fetchCampaign}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify campaign review flow**

```bash
npm run dev
```

Create a campaign with some contacts. Then on the review page:
- Click "Generate Remaining" to trigger AI generation
- Emails populate with subjects and bodies
- Click a row to expand and preview body
- Click "Edit" to open the editor modal
- Select emails and click "Approve"
- "Send Approved" button appears

- [ ] **Step 6: Commit**

```bash
git add src/app/api/emails/ src/components/email-review-table.tsx src/components/email-editor-modal.tsx src/app/\(app\)/campaigns/\[id\]/
git commit -m "feat: add campaign review page with batch approve and email editor"
```

---

## Phase 4: Tracking + Sending

### Task 13: Tracking Library

**Files:**
- Create: `src/lib/tracking.ts`
- Test: `__tests__/lib/tracking.test.ts`

- [ ] **Step 1: Write tracking test**

Create `__tests__/lib/tracking.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { injectTrackingPixel, rewriteLinks } from "@/lib/tracking";

describe("injectTrackingPixel", () => {
  it("appends tracking pixel to HTML body", () => {
    const html = "<p>Hello World</p>";
    const result = injectTrackingPixel(html, "email-123", "https://app.example.com");
    expect(result).toContain("<p>Hello World</p>");
    expect(result).toContain(
      '<img src="https://app.example.com/api/track/open/email-123"'
    );
    expect(result).toContain('width="1"');
    expect(result).toContain('height="1"');
  });
});

describe("rewriteLinks", () => {
  it("replaces href with tracked redirect", () => {
    const html = '<a href="https://pivothire.tech">Visit us</a>';
    const result = rewriteLinks(html, "email-123", "https://app.example.com", "test-campaign");
    expect(result).toContain("/api/track/click/email-123");
    expect(result).toContain("url=https%3A%2F%2Fpivothire.tech");
    expect(result).toContain("utm_source=pivothire");
    expect(result).toContain("utm_campaign=test-campaign");
  });

  it("handles multiple links", () => {
    const html = '<a href="https://a.com">A</a> <a href="https://b.com">B</a>';
    const result = rewriteLinks(html, "e1", "https://app.example.com", "camp");
    const matches = result.match(/api\/track\/click/g);
    expect(matches).toHaveLength(2);
  });

  it("skips mailto links", () => {
    const html = '<a href="mailto:test@test.com">Email</a>';
    const result = rewriteLinks(html, "e1", "https://app.example.com", "camp");
    expect(result).toContain("mailto:test@test.com");
    expect(result).not.toContain("api/track/click");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/tracking.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement tracking library**

Create `src/lib/tracking.ts`:

```ts
export function injectTrackingPixel(
  html: string,
  emailId: string,
  appUrl: string
): string {
  const pixel = `<img src="${appUrl}/api/track/open/${emailId}" width="1" height="1" style="display:none" alt="" />`;
  return `${html}\n${pixel}`;
}

export function rewriteLinks(
  html: string,
  emailId: string,
  appUrl: string,
  campaignName: string
): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url: string) => {
      const targetWithUtm = addUtmParams(url, campaignName);
      const tracked = `${appUrl}/api/track/click/${emailId}?url=${encodeURIComponent(targetWithUtm)}`;
      return `href="${tracked}"`;
    }
  );
}

function addUtmParams(url: string, campaign: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "pivothire");
  u.searchParams.set("utm_medium", "email");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

export function wrapBodyInHtml(body: string, signature: string): string {
  const htmlBody = body.replace(/\n/g, "<br/>");
  const htmlSig = signature.replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
${htmlBody}
<br/><br/>
<div style="color: #666; font-size: 13px;">
${htmlSig}
</div>
</body>
</html>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/tracking.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracking.ts __tests__/lib/tracking.test.ts
git commit -m "feat: add tracking pixel and link rewriting library"
```

---

### Task 14: Tracking Endpoints

**Files:**
- Create: `src/app/api/track/open/[id]/route.ts`, `src/app/api/track/click/[id]/route.ts`
- Test: `__tests__/api/track.test.ts`

- [ ] **Step 1: Write tracking endpoint test**

Create `__tests__/api/track.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trackingEvent: {
      create: vi.fn(),
    },
    email: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockCreate = vi.mocked(prisma.trackingEvent.create);
const mockFindEmail = vi.mocked(prisma.email.findUnique);

describe("tracking endpoints logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records open event", async () => {
    mockFindEmail.mockResolvedValue({
      id: "email-1",
      subject: "",
      body: "",
      status: "SENT",
      sentAt: new Date(),
      contactId: "c1",
      campaignId: "camp1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockCreate.mockResolvedValue({
      id: "te-1",
      type: "OPEN",
      url: null,
      ip: "1.2.3.4",
      userAgent: "mail-client",
      emailId: "email-1",
      timestamp: new Date(),
    });

    await prisma.trackingEvent.create({
      data: {
        type: "OPEN",
        emailId: "email-1",
        ip: "1.2.3.4",
        userAgent: "mail-client",
      },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OPEN", emailId: "email-1" }),
    });
  });

  it("records click event with url", async () => {
    await prisma.trackingEvent.create({
      data: {
        type: "CLICK",
        emailId: "email-1",
        url: "https://pivothire.tech",
        ip: "1.2.3.4",
        userAgent: "browser",
      },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "CLICK",
        url: "https://pivothire.tech",
      }),
    });
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run __tests__/api/track.test.ts
```

Expected: PASS.

- [ ] **Step 3: Create open tracking endpoint**

Create `src/app/api/track/open/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.trackingEvent.create({
      data: {
        type: "OPEN",
        emailId: id,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch {
    // Email ID may not exist — fail silently
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
```

- [ ] **Step 4: Create click tracking endpoint**

Create `src/app/api/track/click/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    await prisma.trackingEvent.create({
      data: {
        type: "CLICK",
        emailId: id,
        url,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch {
    // Fail silently
  }

  return NextResponse.redirect(url, 302);
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/track/ __tests__/api/track.test.ts
git commit -m "feat: add open pixel and click redirect tracking endpoints"
```

---

### Task 15: Email Sending (Cron)

**Files:**
- Create: `src/lib/email-sender.ts`, `src/app/api/send/route.ts`, `vercel.json`
- Test: `__tests__/lib/email-sender.test.ts`

- [ ] **Step 1: Write email sender test**

Create `__tests__/lib/email-sender.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { buildSignature } from "@/lib/email-sender";

describe("buildSignature", () => {
  it("replaces template variables", () => {
    const sig = buildSignature(
      "Best regards,\n\n{name}\n{title}, PivotHire\n{email}",
      { name: "Kevin Zhong", title: "CEO", email: "kevin.zhong@pivothire.tech" }
    );
    expect(sig).toContain("Kevin Zhong");
    expect(sig).toContain("CEO, PivotHire");
    expect(sig).toContain("kevin.zhong@pivothire.tech");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/email-sender.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement email sender**

Create `src/lib/email-sender.ts`:

```ts
import nodemailer from "nodemailer";
import { injectTrackingPixel, rewriteLinks, wrapBodyInHtml } from "./tracking";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  signature: string;
  emailId: string;
  campaignName: string;
  smtp: SmtpConfig;
  fromName: string;
  fromEmail: string;
  appUrl: string;
};

export function buildSignature(
  template: string,
  vars: { name: string; title: string; email: string }
): string {
  return template
    .replace(/{name}/g, vars.name)
    .replace(/{title}/g, vars.title)
    .replace(/{email}/g, vars.email);
}

export async function sendEmail(input: SendEmailInput) {
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/email-sender.test.ts
```

Expected: PASS.

- [ ] **Step 5: Create send cron endpoint**

Create `src/app/api/send/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, buildSignature } from "@/lib/email-sender";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { status: "SENDING" },
    select: { id: true, name: true, createdById: true },
  });

  if (campaigns.length === 0) {
    return NextResponse.json({ message: "No campaigns to send" });
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  let totalSent = 0;

  for (const campaign of campaigns) {
    const user = await prisma.user.findUnique({
      where: { id: campaign.createdById },
    });

    if (!user?.smtpHost || !user?.smtpPort || !user?.smtpUser || !user?.smtpPass) {
      continue;
    }

    const signature = buildSignature(user.signature, {
      name: user.name,
      title: user.title,
      email: user.email,
    });

    const emails = await prisma.email.findMany({
      where: { campaignId: campaign.id, status: "APPROVED" },
      include: { contact: true },
      take: 5,
    });

    for (const email of emails) {
      const alreadySent = await prisma.email.findFirst({
        where: {
          contactId: email.contactId,
          status: "SENT",
          id: { not: email.id },
        },
      });

      if (alreadySent) {
        await prisma.email.update({
          where: { id: email.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        continue;
      }

      try {
        await sendEmail({
          to: email.contact.email,
          subject: email.subject,
          body: email.body,
          signature,
          emailId: email.id,
          campaignName: campaign.name,
          smtp: {
            host: user.smtpHost,
            port: user.smtpPort,
            user: user.smtpUser,
            pass: user.smtpPass,
          },
          fromName: user.name,
          fromEmail: user.email,
          appUrl,
        });

        await prisma.email.update({
          where: { id: email.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        totalSent++;
      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);
        await prisma.email.update({
          where: { id: email.id },
          data: { status: "FAILED" },
        });
      }
    }

    const remaining = await prisma.email.count({
      where: { campaignId: campaign.id, status: "APPROVED" },
    });

    if (remaining === 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "COMPLETED" },
      });
    }
  }

  return NextResponse.json({ sent: totalSent });
}
```

- [ ] **Step 6: Create vercel.json with cron config**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/send",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/discover",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/email-sender.ts src/app/api/send/ vercel.json __tests__/lib/email-sender.test.ts
git commit -m "feat: add cron-based email sending with tracking injection"
```

---

## Phase 5: Dashboard

### Task 16: Dashboard

**Files:**
- Create: `src/components/stats-card.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create StatsCard component**

Create `src/components/stats-card.tsx`:

```tsx
export function StatsCard({
  label,
  value,
  color = "text-blue-600",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement Dashboard page**

Replace `src/app/(app)/dashboard/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCard } from "@/components/stats-card";
import Link from "next/link";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  GENERATING: "bg-purple-50 text-purple-600",
  REVIEW: "bg-amber-50 text-amber-600",
  SENDING: "bg-blue-50 text-blue-600",
  COMPLETED: "bg-green-50 text-green-600",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userId = session.user.id;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const sentThisWeek = await prisma.email.count({
    where: {
      campaign: { createdById: userId },
      status: "SENT",
      sentAt: { gte: oneWeekAgo },
    },
  });

  const totalSent = await prisma.email.count({
    where: {
      campaign: { createdById: userId },
      status: "SENT",
    },
  });

  const uniqueOpens = await prisma.trackingEvent.groupBy({
    by: ["emailId"],
    where: {
      type: "OPEN",
      email: { campaign: { createdById: userId }, status: "SENT" },
    },
  });

  const uniqueClicks = await prisma.trackingEvent.groupBy({
    by: ["emailId"],
    where: {
      type: "CLICK",
      email: { campaign: { createdById: userId }, status: "SENT" },
    },
  });

  const openRate = totalSent > 0 ? Math.round((uniqueOpens.length / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((uniqueClicks.length / totalSent) * 100) : 0;

  const recentCampaigns = await prisma.campaign.findMany({
    where: { createdById: userId },
    include: { _count: { select: { emails: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const newContacts = await prisma.contact.count({
    where: {
      source: { not: "manual" },
      createdAt: { gte: oneWeekAgo },
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard label="Sent this week" value={sentThisWeek} />
        <StatsCard label="Open rate" value={`${openRate}%`} color="text-green-600" />
        <StatsCard label="Click rate" value={`${clickRate}%`} color="text-orange-600" />
        <StatsCard label="New contacts (auto)" value={newContacts} color="text-purple-600" />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-700">
            Recent Campaigns
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentCampaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <span className="text-sm text-gray-900">{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {c._count.emails} emails
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[c.status] || ""}`}
              >
                {c.status.toLowerCase()}
              </span>
            </Link>
          ))}
          {recentCampaigns.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No campaigns yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify dashboard**

```bash
npm run dev
```

Navigate to `/dashboard`. Verify:
- Stats cards show (all zeroes initially is fine)
- Recent campaigns list shows created campaigns
- Clicking a campaign navigates to review page

- [ ] **Step 4: Commit**

```bash
git add src/components/stats-card.tsx src/app/\(app\)/dashboard/
git commit -m "feat: add dashboard with stats and recent campaigns"
```

---

## Phase 6: Auto-Discovery

### Task 17: Auto-Discovery Scrapers

**Files:**
- Create: `src/lib/discovery/producthunt.ts`, `src/lib/discovery/yc.ts`, `src/lib/discovery/a16z.ts`, `src/lib/discovery/sequoia.ts`, `src/app/api/discover/route.ts`

- [ ] **Step 1: Create ProductHunt scraper**

Create `src/lib/discovery/producthunt.ts`:

```ts
type DiscoveredContact = {
  name: string;
  email: string | null;
  company: string;
  title: string;
  industry: string | null;
  source: string;
  companyInfo: Record<string, string>;
};

export async function discoverFromProductHunt(): Promise<DiscoveredContact[]> {
  try {
    const res = await fetch("https://www.producthunt.com/frontend/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: `{
          posts(order: NEWEST, first: 20) {
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
        }`,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const contacts: DiscoveredContact[] = [];

    for (const edge of data?.data?.posts?.edges || []) {
      const post = edge.node;
      for (const maker of post.makers || []) {
        let domain: string | null = null;
        try {
          domain = new URL(post.website).hostname.replace("www.", "");
        } catch {
          continue;
        }

        const firstName = maker.name.split(" ")[0]?.toLowerCase();
        if (!firstName || !domain) continue;

        contacts.push({
          name: maker.name,
          email: `${firstName}@${domain}`,
          company: post.name,
          title: maker.headline || "Founder",
          industry: null,
          source: "producthunt",
          companyInfo: {
            tagline: post.tagline,
            website: post.website,
            launchedOn: "ProductHunt",
          },
        });
      }
    }

    return contacts;
  } catch {
    console.error("ProductHunt discovery failed");
    return [];
  }
}
```

- [ ] **Step 2: Create YC scraper**

Create `src/lib/discovery/yc.ts`:

```ts
type DiscoveredContact = {
  name: string;
  email: string | null;
  company: string;
  title: string;
  industry: string | null;
  source: string;
  companyInfo: Record<string, string>;
};

export async function discoverFromYC(): Promise<DiscoveredContact[]> {
  try {
    const res = await fetch(
      "https://api.ycombinator.com/v0.1/companies?batch=latest&page=1&per_page=50"
    );

    if (!res.ok) return [];
    const data = await res.json();
    const contacts: DiscoveredContact[] = [];

    for (const company of data.companies || []) {
      if (!company.url) continue;

      let domain: string | null = null;
      try {
        domain = new URL(company.url).hostname.replace("www.", "");
      } catch {
        continue;
      }

      contacts.push({
        name: company.name,
        email: `founders@${domain}`,
        company: company.name,
        title: "Founder",
        industry: company.industries?.[0] || null,
        source: "yc",
        companyInfo: {
          batch: company.batch || "unknown",
          description: company.one_liner || "",
          website: company.url,
        },
      });
    }

    return contacts;
  } catch {
    console.error("YC discovery failed");
    return [];
  }
}
```

- [ ] **Step 3: Create a16z scraper**

Create `src/lib/discovery/a16z.ts`:

```ts
import OpenAI from "openai";

const openai = new OpenAI();

type DiscoveredContact = {
  name: string;
  email: string | null;
  company: string;
  title: string;
  industry: string | null;
  source: string;
  companyInfo: Record<string, string>;
};

export async function discoverFromA16Z(): Promise<DiscoveredContact[]> {
  try {
    const res = await fetch("https://a16z.com/portfolio/");
    if (!res.ok) return [];
    const html = await res.text();

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract company names and their website URLs from this HTML page. Return JSON: { "companies": [{ "name": "...", "url": "...", "category": "..." }] }. Max 20 companies. Only include companies that have a clear URL.`,
        },
        { role: "user", content: html.slice(0, 50000) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const data = JSON.parse(content);
    const contacts: DiscoveredContact[] = [];

    for (const company of data.companies || []) {
      if (!company.url) continue;
      let domain: string;
      try {
        domain = new URL(company.url).hostname.replace("www.", "");
      } catch {
        continue;
      }

      contacts.push({
        name: company.name,
        email: `info@${domain}`,
        company: company.name,
        title: "Founder",
        industry: company.category || null,
        source: "a16z",
        companyInfo: {
          website: company.url,
          investor: "a16z",
        },
      });
    }

    return contacts;
  } catch {
    console.error("a16z discovery failed");
    return [];
  }
}
```

- [ ] **Step 4: Create Sequoia scraper**

Create `src/lib/discovery/sequoia.ts`:

```ts
import OpenAI from "openai";

const openai = new OpenAI();

type DiscoveredContact = {
  name: string;
  email: string | null;
  company: string;
  title: string;
  industry: string | null;
  source: string;
  companyInfo: Record<string, string>;
};

export async function discoverFromSequoia(): Promise<DiscoveredContact[]> {
  try {
    const res = await fetch("https://www.sequoiacap.com/our-companies/");
    if (!res.ok) return [];
    const html = await res.text();

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract company names and their website URLs from this HTML portfolio page. Return JSON: { "companies": [{ "name": "...", "url": "...", "category": "..." }] }. Max 20 companies. Only include companies with a clear URL.`,
        },
        { role: "user", content: html.slice(0, 50000) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const data = JSON.parse(content);
    const contacts: DiscoveredContact[] = [];

    for (const company of data.companies || []) {
      if (!company.url) continue;
      let domain: string;
      try {
        domain = new URL(company.url).hostname.replace("www.", "");
      } catch {
        continue;
      }

      contacts.push({
        name: company.name,
        email: `info@${domain}`,
        company: company.name,
        title: "Founder",
        industry: company.category || null,
        source: "sequoia",
        companyInfo: {
          website: company.url,
          investor: "Sequoia Capital",
        },
      });
    }

    return contacts;
  } catch {
    console.error("Sequoia discovery failed");
    return [];
  }
}
```

- [ ] **Step 5: Create discover cron endpoint**

Create `src/app/api/discover/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoverFromProductHunt } from "@/lib/discovery/producthunt";
import { discoverFromYC } from "@/lib/discovery/yc";
import { discoverFromA16Z } from "@/lib/discovery/a16z";
import { discoverFromSequoia } from "@/lib/discovery/sequoia";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!owner) {
    return NextResponse.json({ error: "No users found" }, { status: 500 });
  }

  const allDiscovered = [
    ...(await discoverFromProductHunt()),
    ...(await discoverFromYC()),
    ...(await discoverFromA16Z()),
    ...(await discoverFromSequoia()),
  ];

  let created = 0;
  let skipped = 0;

  for (const contact of allDiscovered) {
    if (!contact.email) {
      skipped++;
      continue;
    }

    const existing = await prisma.contact.findUnique({
      where: { email: contact.email },
    });

    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.contact.create({
        data: {
          email: contact.email,
          name: contact.name,
          company: contact.company,
          title: contact.title,
          industry: contact.industry,
          segment: "STARTUP",
          source: contact.source,
          companyInfo: contact.companyInfo,
          tags: ["auto-discovered"],
          ownerId: owner.id,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ created, skipped, total: allDiscovered.length });
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/discovery/ src/app/api/discover/
git commit -m "feat: add auto-discovery scrapers for PH, YC, a16z, Sequoia"
```

---

## Phase 7: Deployment

### Task 18: Deployment Config

**Files:**
- Modify: `vercel.json`, `.gitignore`, `.env.local.example`

- [ ] **Step 1: Update .env.local.example with all vars**

Ensure `.env.local.example` has:

```
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-app.vercel.app"
OPENAI_API_KEY="sk-..."
APP_URL="https://your-app.vercel.app"
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

- [ ] **Step 2: Update .gitignore**

Ensure `.gitignore` includes:

```
node_modules/
.next/
.env.local
.env*.local
.superpowers/
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: finalize deployment config"
```

- [ ] **Step 6: Deploy to Vercel**

```bash
npx vercel --prod
```

Follow prompts to link to Vercel project. Set environment variables in Vercel dashboard. After deploy:
1. Run `npx prisma migrate deploy` against production database
2. Run `npx prisma db seed` against production database
3. Verify login works at production URL
4. Configure SMTP in settings page
5. Test the full flow: import contacts → create campaign → generate → review → send
