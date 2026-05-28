<!--
  audit.md — Architecture Review
  Prepared : 2026-05-26
  Author   : Engineering / AI-assisted review
  Audience : Management & team leads
  Purpose  : Identify architectural risks and suggest improvements
             across stability, scalability, and security.
  Scope    : Proprely web app (Next.js + Supabase + Vercel)
-->

# Architecture Audit — Proprely

> **What this document is.**
> A plain-language review of how the app is built today, where the risks are,
> and what we should fix — sorted by how urgent each item is.

---

## Overall Picture

The app is built on solid modern tools (Next.js, Supabase, Vercel, Sentry) and
the code is generally well-structured. Most issues below are not emergencies —
they are the kind of technical debt that accumulates during fast-moving early
development and should be addressed before the user base grows.

---

### 1. All Data Loads at Once on Every Page Visit
**What it is.** Every time a user opens the app, the server fetches the entire
company dataset — all missions, clients, agents, quotes, hours, etc. — in one
large batch before showing anything.

**Risk / Symptom.** Works fine today with small datasets. As companies grow
(hundreds of missions, many agents), page load times will increase noticeably.
There is also a Supabase query cost concern at scale.

**Fix.** Load only the data needed for the current page, and fetch the rest on
demand. This is a phased refactor — start with the heaviest pages (planning,
cockpit).

---

### 2. Backend is Built Inside the Frontend Framework
**What it is.** All backend logic — API routes, database access, scheduled jobs,
email sending, business rules — lives inside Next.js, which is primarily a
frontend framework. While Next.js supports basic server-side code, it was not
designed to handle the weight of a full application backend. NestJS is a
dedicated backend framework built specifically for this kind of structured,
scalable server-side work.

**Risk / Symptom.** As the product grows, mixing frontend and backend in one
codebase creates friction: harder to scale each side independently, harder to
test business logic in isolation, and harder to onboard backend-focused
developers who expect a clear server structure. API routes in Next.js also
lack built-in support for things NestJS handles out of the box — dependency
injection, modular service layers, guards, interceptors, and proper separation
of concerns.

**Fix.** Plan a gradual migration of backend logic into a dedicated NestJS
service. Start by extracting the most complex and tested areas (data actions,
cron jobs, email workflows) into a standalone API, while Next.js continues to
serve the frontend. This is a medium-term architectural investment, not an
emergency — but the longer it waits, the more expensive the eventual split.

---

### 3. No Standard Format for API Requests and Responses
**What it is.** Different parts of the app return data in completely different
shapes. Server actions use at least three separate result types (`WriteResult`,
`ActionResult`, `InvitationActionResult`) defined independently with no shared
base. API routes return raw objects with no consistent structure — and some
return HTTP 200 even when reporting an error, with the error buried inside the
response body. There is no single agreed-upon contract for how the system
communicates success or failure.

**Risk / Symptom.** Every frontend component has to handle responses
differently and guess what shape it will receive. This leads to inconsistent
error messages shown to users, bugs that only appear in specific flows, and
significant extra work whenever a new endpoint is added. It also makes the API
impossible to document or test systematically.

**Fix.** Define one shared response envelope across all API routes and server
actions — for example `{ success: true, data: ... }` on success and
`{ success: false, error: { code, message } }` on failure. Enforce it via a
shared wrapper utility. Low disruption, high payoff in developer clarity.

---

### 4. The Entire App is Hard-Coupled to Supabase
**What it is.** Supabase is called directly from nearly every corner of the
codebase — 183 direct database calls spread across 39 files, including page
components, UI components, layouts, background jobs, and API routes. There is
no abstraction layer between the app and the database.

**Risk / Symptom.** The app cannot function at all without Supabase — there is
no clean way to swap, mock, or extend the data layer without touching dozens of
files at once. If Supabase changes its API, raises prices, has an outage, or no
longer fits the product's needs, migrating away would be an enormous effort.
Automated testing is also painful: tests must either hit a live Supabase
instance or work around the missing abstraction with fragile workarounds (the
current "dummy mode").

**Fix.** Introduce a repository layer — a set of focused service files that own
all database interactions. The rest of the app talks to these services, not to
Supabase directly. Supabase becomes a swappable implementation detail. Best
done incrementally alongside the NestJS migration (issue 2).

---

### 5. Updating Small Data Forces a Full Page Re-render
**What it is.** Every time a user saves a change — assigning a mission, updating
a client, marking a task done — the app tells the server to re-fetch and
re-render the entire page from scratch. For example, changing the status of one
mission triggers a full reload of the entire cockpit view, which re-fetches all
missions, agents, and operational items for the company.

**Risk / Symptom.** The screen flickers or goes blank momentarily on every
save. As data grows, these reloads get slower. The app feels unresponsive
compared to modern tools where small updates happen instantly in place. This
also puts unnecessary load on the database for reads that aren't needed.

**Fix.** Update only the affected piece of data in the local store immediately
after a successful save (optimistic update), without waiting for a full page
reload. The data layer and store (Zustand) are already in place — it is a
matter of wiring mutations to local state updates rather than full-page
revalidation.

---

### 6. Form Validation is Hand-Built When Better Tools Are Already Installed
**What it is.** The app handles form validation using a custom-built approach —
HTML5 browser attributes plus a custom hook that translates browser error
messages into French. Meanwhile, two industry-standard libraries for this exact
job (`react-hook-form` and `@hookform/resolvers`) are already installed as
dependencies but never used anywhere in the codebase. Zod — also already in
use server-side — could be shared directly with the client for real-time
validation with no duplication.

**Current limitation.** On complex forms (e.g. the pricing settings panel with
10+ fields), users only find out something is wrong after submitting. Errors
come back as a single message rather than appearing inline under the specific
field that failed. There is also no dirty tracking or easy form reset.

**Recommendation.** Adopt React Hook Form with Zod resolvers for complex,
multi-field forms. The packages are already installed — it is a matter of
using them. Start with the highest-friction forms (pricing settings, onboarding
steps) where the UX improvement would be most visible. Simple auth forms
(login, signup) can stay as-is since they work well enough with the current
approach.

---

### 7. Shared Components Exist but Are Not Consistently Used
**What it is.** The project has a shared component library with the right
building blocks — reusable cards, status badges, empty states, page headers,
confirm dialogs, and stat cards. However, these are only used some of the time.
The same UI patterns are frequently recreated inline from scratch instead:

- The "no results" empty state is written 25+ different ways across pages,
  each with slightly different text, spacing, and styling.
- The error alert box (red background, error message) is hand-copied 22 times
  across forms and pages instead of using a single shared component.
- The loading spinner inside buttons is duplicated 25 times inline rather than
  using a shared loading button.
- Status badge chips are recreated 16 times in different colors instead of
  using the `StatusBadge` component that already exists.
- The white card wrapper with border and shadow is written inline 28 times
  rather than using the existing `Card` component.

**Risk / Symptom.** When a design change is needed — adjusting a color, fixing
a spacing issue, updating an error message style — it has to be applied in
dozens of separate places instead of one. This leads to visual inconsistencies
across the app and makes future UI updates slow and error-prone.

**Recommendation.** Establish a team rule: before writing new UI markup, check
the shared components folder first. When a pattern appears more than twice,
extract it into a shared component. No large refactor needed — this improves
with discipline on new code going forward.

---

### 8. Soft Delete is Only Applied to Some Tables
**What it is.** Soft delete is a safety mechanism where deleting a record does
not actually remove it from the database — it just marks it as archived. This
means accidental deletions can be recovered. The project implements this
correctly for `clients`, `sites`, and `agents`, but every other table uses
hard delete — the data is permanently and immediately gone.

**Tables with no recovery on delete:** missions, opportunities, leads, quotes,
time entries, SOPs, and more.

**Risk.** For a field operations app, missions and time entries are the core
business data. A manager who accidentally deletes a mission, or an agent whose
hours get wiped, has no way to recover that data. There is no undo, no trash,
no audit trail for these deletions.

**Fix.** Extend soft delete to the critical operational tables — at minimum
`missions` and `time_entries`, then `quotes` and `opportunities`. The pattern
is already established in the codebase (the `archived_at` column + partial
index approach from `20260519000000_soft_delete.sql`) so it is straightforward
to replicate. Each table needs a migration to add the column and a filter added
to the data queries.

---

### 9. No ORM — Database Types and Schema Are Managed by Hand
**What it is.** The project has no ORM (Object-Relational Mapper). All database
queries are written using Supabase's raw query builder
(`supabase.from('table').select()`), and the database schema is managed through
30 hand-written SQL migration files with no tooling to generate or validate
them.

**The practical problem.** The TypeScript types that represent database records
(`Agent`, `Client`, `Mission`, etc.) are written by hand and have no connection
to the actual database schema. If a developer adds a column in a migration but
forgets to update the TypeScript type — or the other way around — the mismatch
goes undetected until something breaks at runtime. There is no single source of
truth tying the schema, the types, and the queries together.

**Onboarding impact.** A new developer joining the project has to read through
30 raw SQL files to understand the data model. There is no generated schema
reference, no entity relationship map, and no way to introspect the database
structure from code.

**Recommendation.** Adopt **Drizzle ORM** — the best fit for this stack. It is
lightweight, works natively with Supabase and Postgres, and defines the schema
in TypeScript. Migrations are auto-generated from schema changes, queries are
fully type-safe, and the types always stay in sync with the database. This is
best introduced alongside the NestJS migration (issue 2) and the repository
layer (issue 4), as all three work naturally together.

---

### 10. Data Fetching Has No Caching and Rebuilds Everything on Every Change
**What it is.** Every page load fetches the entire company dataset from scratch.
When a user saves any change — a single mission status, one client field — the
app reloads the entire page and re-fetches all data. If a save fails, the UI
gets stuck showing incorrect data until the user manually refreshes the browser.
Navigating back to a previously visited page fetches everything again from
scratch.

**Risk / Symptom.** The app feels slow and flickers on every action. As data
grows the problem gets worse. Failed saves leave the UI in a broken state with
no automatic recovery.

**Recommendation.** Adopt **TanStack Query** for server data fetching. Each
page loads only what it needs. Saves update only the changed item without
touching the rest. Failed saves automatically roll back to the previous state.
Previously visited pages load instantly from cache. Zustand stays in place for
UI state (modals, filters, local interactions) — TanStack Query handles server
data. The two are designed to work together.

---

## Security Issues

### 11. Dummy Mode Disables All Security in Misconfigured Environments
**What it is.** When Supabase environment variables are missing, the app falls
into a development fallback mode where every permission check returns `owner`
access with no verification. RBAC, Row Level Security, and all auth gates are
completely bypassed. One misconfigured production deploy exposes all tenant
data to anyone.

**Fix.** Add a deployment gate that fails the release if Supabase variables are
missing. A runtime check already exists — it needs to also run as a CI
post-deploy step.

---

### 12. Password Policy is Too Weak
**What it is.** The minimum password length is 6 characters with no complexity
requirements and no check against commonly used passwords. For a B2B platform
managing staff data, hours, and financials, this is below the acceptable
minimum.

**Fix.** Raise the minimum to at least 12 characters. Add a basic complexity
rule (mix of letters and numbers). Supabase allows custom password policies in
the Auth settings.

---

### 13. No CORS Policy on API Routes
**What it is.** None of the API routes define `Access-Control-Allow-Origin`
headers. This means any external website can make cross-origin requests to the
API from a user's browser. Combined with session cookies, this could allow a
malicious page to silently call authenticated API endpoints on behalf of a
logged-in user.

**Fix.** Add a CORS middleware in `next.config.ts` that restricts
`Access-Control-Allow-Origin` to the app's own domain. Deny all other origins
by default. Public endpoints (health, cron) can stay open; authenticated routes
should be locked down.

---

### 14. `unsafe-inline` Scripts Still Allowed in Production CSP
**What it is.** The Content Security Policy allows inline scripts in production
(`unsafe-inline` in `script-src`). This weakens the browser's built-in
protection against cross-site scripting — if an attacker manages to inject a
script, the CSP provides no barrier to stop it running.

**Fix.** Migrate to nonce-based CSP. Each server response generates a
one-time token that is attached to legitimate script tags. Any injected script
without the nonce is blocked. Estimated effort: 2–3 days.

---

## Summary Table

| # | Issue | Area | Priority |
|---|-------|------|----------|
| 1 | All data loaded at once, every page | Scalability | 🟡 Medium |
| 2 | Backend mixed into frontend framework (Next.js vs NestJS) | Scalability | 🟡 Medium |
| 3 | No standard format for API requests and responses | Stability | 🟡 Medium |
| 4 | Entire app hard-coupled to Supabase | Scalability | 🟡 Medium |
| 5 | Small updates trigger full page re-render | Stability | 🟡 Medium |
| 6 | Custom form validation instead of installed standard libraries | UX | 🟢 Low |
| 7 | Shared components exist but are not consistently used | Stability | 🟢 Low |
| 8 | Soft delete inconsistent — critical tables use hard delete | Stability | 🟡 Medium |
| 9 | No ORM — schema, types, and queries are disconnected | Stability | 🟡 Medium |
| 10 | No data caching — full reload on every change | Performance | 🟡 Medium |
| 11 | Dummy mode disables all security in misconfigured environments | Security | 🔴 High |
| 12 | Password policy too weak (6 char minimum, no complexity) | Security | 🟡 Medium |
| 13 | No CORS policy on API routes | Security | 🟡 Medium |
| 14 | `unsafe-inline` scripts in production CSP | Security | 🟢 Low |

---

*For questions about any item, reach out to the engineering lead.*
