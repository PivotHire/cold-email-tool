# PivotHire Cold Email Platform — Design Spec

## Overview

Internal cold email platform for PivotHire's sales outreach. Manages contact lists (manual LLM import + auto-discovery), generates personalized cold emails via GPT-5.4-mini, provides a batch review UI, and sends via SMTP with open/click tracking.

**Users:** Kevin Zhong (CEO) and Joshua Chen (CTO) only.

**Target customers:**
- **Startups** — need outsourced engineering resources (fast delivery, flexibility, cost-effective)
- **Traditional enterprises** — need digital transformation / IT modernization (information asymmetry opportunity, higher margins)

## Architecture

Single Next.js App Router application deployed on Vercel. PostgreSQL (Neon) via Prisma ORM. Vercel Cron for scheduled tasks (email sending + auto-discovery).

```
Browser
  │
  ├─ Next.js App Router (Vercel)
  │    ├─ Pages: /login, /dashboard, /contacts, /campaigns, /campaigns/[id], /templates, /settings
  │    ├─ API: /api/generate, /api/send (cron), /api/discover (cron)
  │    ├─ Tracking: /api/track/open/[id], /api/track/click/[id]
  │    └─ Auth: NextAuth.js + Credentials provider
  │
  ├─ PostgreSQL (Neon on Vercel)
  │    └─ Prisma ORM
  │
  └─ External
       ├─ OpenAI API (GPT-5.4-mini)
       ├─ User's SMTP server
       └─ Public data sources (ProductHunt, YC, a16z, Sequoia)
```

**Core flow:** Create Campaign → Select Contacts → AI Generate Emails → Batch Review/Edit → Confirm Send → Cron Dispatches in Batches → Track Results

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Auth:** NextAuth.js + Credentials provider (bcrypt passwords)
- **Email sending:** Nodemailer (user's SMTP)
- **AI:** OpenAI SDK (GPT-5.4-mini)
- **Deployment:** Vercel
- **Styling:** Tailwind CSS
- **Tracking:** Self-built (open pixel + click redirect) + GA UTM parameters

## Data Model

### User

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| email | String (unique) | Whitelisted: kevin.zhong@pivothire.tech, joshua.chen@pivothire.tech |
| password | String | bcrypt hashed |
| name | String | "Kevin Zhong" / "Joshua Chen" |
| title | String | "CEO" / "CTO" — used in email signature |
| smtpConfig | Json? | Optional per-user SMTP config |

### Contact

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| email | String (unique) | Global dedup — one record per email address |
| name | String | |
| company | String | |
| title | String? | Recipient's job title (CEO, CTO, etc.) |
| industry | String? | fintech, ecommerce, healthcare, manufacturing, etc. |
| segment | Enum | "startup" \| "traditional" |
| source | String | "manual" \| "producthunt" \| "yc" \| "a16z" \| "sequoia" |
| companyInfo | Json? | Funding, product launches, tech stack, etc. |
| tags | String[] | Custom tags |
| ownerId | String (FK → User) | Creator owns edit rights; others get read-only |

### Campaign

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| name | String | e.g. "YC S25 Batch" |
| status | Enum | draft → generating → review → sending → completed |
| segment | String? | Target segment filter |
| industry | String? | Target industry filter |
| templatePrompt | Text? | Optional strategy notes for GPT |
| createdById | String (FK → User) | Owner — data scoped per user |

### Email

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| subject | String | Email subject line |
| body | Text | HTML body |
| status | Enum | generated → approved → sent → failed |
| sentAt | DateTime? | |
| contactId | String (FK → Contact) | |
| campaignId | String (FK → Campaign) | |

Dedup rule: when sending, skip if any Email with status "sent" already exists for this Contact (regardless of which user's Campaign it belonged to).

### TrackingEvent

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| type | Enum | "open" \| "click" |
| url | String? | Target URL for click events |
| timestamp | DateTime | |
| ip | String? | |
| userAgent | String? | |
| emailId | String (FK → Email) | |

## Authentication

- NextAuth.js with Credentials provider
- Email + password login (bcrypt hashed)
- Whitelist validation: only `kevin.zhong@pivothire.tech` and `joshua.chen@pivothire.tech` can log in
- Session-based auth with JWT

## Pages

### 1. Login (`/login`)

Simple email + password form. PivotHire logo branding. Rejects non-whitelisted emails.

### 2. Dashboard (`/dashboard`)

- Stats cards: emails sent (this week), open rate, click rate
- Recent campaigns list with status badges
- Data scoped to current user, with a toggle to view the other user's stats (read-only)

### 3. Contacts (`/contacts`)

- Tab: "My Contacts" (read-write) / "{Other user}'s Contacts" (read-only)
- Table: name, company, title, segment badge, source, tags
- Actions: LLM Import button, Auto-discover button
- Search and filter by segment/industry/source/tags

**LLM Import:** Paste any unstructured text (LinkedIn profile, email signature, website team page, spreadsheet copy-paste). GPT-5.4-mini parses into structured Contact fields (name, email, company, title, industry, segment). Results displayed in an editable table preview. User corrects any parsing errors, then confirms to save. Duplicates (by email) are flagged and skipped.

### 4. Create Campaign (`/campaigns/new`)

- Form: campaign name, segment dropdown, industry dropdown, strategy notes (optional textarea)
- Contact selection: filterable list with checkboxes, shows dedup warnings if contacts were already emailed
- "Generate Emails" button triggers AI generation

### 5. Campaign Review (`/campaigns/[id]`)

- Batch review table: checkbox, recipient, subject preview, status badge, edit button
- Click a row to expand/preview full email content
- Edit button opens inline editor for subject + body
- Bulk actions: approve all, send all approved
- "Send All Approved" button queues emails for Cron dispatch

### 6. Templates (`/templates`)

- List of prompt templates organized by: base → segment → industry
- Each template editable in a textarea
- Hierarchy: base template is always included, segment template adds on top, industry template adds on top of that

### 7. Settings (`/settings`)

- SMTP configuration (host, port, user, password — encrypted at rest)
- Email signature template (customizable format, default: "Best regards,\n\n{name}\n{title}, PivotHire\n{email}")
- User profile (name, title)

## Email Generation

### Prompt Architecture

```
System prompt:
  - Base template (PivotHire value proposition, tone, signature format)
  - Segment layer (startup vs traditional messaging)
  - Industry layer (industry-specific selling points)

User prompt:
  - Contact info: name, company, title, industry
  - Company context: recent funding, product launches (from companyInfo JSON)
  - Strategy notes from Campaign (if provided)
  - Instruction: generate subject + body

Output: JSON { subject, body }
```

### Signature Format

```
Best regards,

{name}
{title}, PivotHire
core@pivothire.tech
```

Signature is appended after generation, not included in the prompt output.

## Email Sending

- Nodemailer with user's SMTP credentials
- Vercel Cron triggers `/api/send` every minute
- Each invocation sends up to 5-10 emails (within Vercel's function timeout)
- Before sending each email: check dedup (skip if Contact already has a "sent" Email from any Campaign)
- After sending: update Email status to "sent", set sentAt timestamp
- On failure: update Email status to "failed"

### Tracking Injection

Before sending, the system:
1. Appends a 1x1 transparent tracking pixel to the HTML body: `<img src="https://{domain}/api/track/open/{emailId}" />`
2. Replaces all links with tracked redirects: `https://{domain}/api/track/click/{emailId}?url={originalUrl}&utm_source=pivothire&utm_medium=email&utm_campaign={campaignName}`

## Tracking

### Open Tracking

`GET /api/track/open/[id]`
- Records a TrackingEvent (type: "open")
- Returns a 1x1 transparent PNG
- Deduplicates: only record first open per email (or track all for timeline data)

### Click Tracking

`GET /api/track/click/[id]?url={target}`
- Records a TrackingEvent (type: "click", url: target)
- Redirects (302) to target URL
- Target URL includes GA UTM parameters for Google Analytics integration

### Dashboard Aggregation

- Open rate = unique emails opened / total emails sent
- Click rate = unique emails clicked / total emails sent
- Per-campaign and per-user breakdowns

## Auto-Discovery

Vercel Cron triggers `/api/discover` daily.

### MVP Sources

| Source | Method | Data |
|--------|--------|------|
| ProductHunt | API (daily new posts) | Product name, maker name, URL, tagline |
| YC Directory | Web scrape (public page) | Company name, batch, founders, URL |
| a16z Portfolio | Web scrape (public page) | Company name, URL, category |
| Sequoia Portfolio | Web scrape (public page) | Company name, URL, category |

### Process

1. Fetch new entries from each source
2. Extract company/founder info
3. Find contact email: check company website team/about pages for public emails; fall back to common patterns (firstname@domain, first.last@domain) and verify with a HEAD request to the mail server (SMTP RCPT TO check)
4. Dedup against existing Contacts
5. Insert new Contacts with source tag, status pending review
6. Notify user on Dashboard: "X new contacts discovered"

### V2 Sources (post-MVP)

- Crunchbase (free API, funding data)
- More VC portfolio pages
- LinkedIn job postings (traditional enterprise signal)
- Indeed/Glassdoor job postings

## UI Design

- **Theme:** Light (Clean White) — white backgrounds, #f8fafc page bg, #2563eb primary blue
- **Layout:** Top navigation bar, full-width content
- **Branding:** PivotHire logo from `https://www.pivothire.tech/logo-light-transparent.png`
- **Components:** Tailwind CSS utility classes
- **Data isolation:** Each user sees both users' data, but only edits their own (read-only toggle for the other user's contacts/campaigns/stats)

## Deployment

- **Platform:** Vercel
- **Database:** Neon PostgreSQL (Vercel integration)
- **Environment variables:** SMTP credentials, OpenAI API key, NextAuth secret, database URL
- **Cron jobs:**
  - `/api/send` — every 1 minute (email dispatch)
  - `/api/discover` — every 24 hours (auto-discovery)
