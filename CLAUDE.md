# Helpdesk — Project Memory

## Project Overview

An AI-powered ticket management system that receives support emails, creates tickets, and uses Claude to classify, summarise, and draft replies.

## Tech Stack

| Concern | Choice |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS + React Router |
| Backend | Node.js + Express + TypeScript |
| Runtime / Package Manager | Bun |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Database sessions |
| AI | Anthropic Claude API |
| Email | SendGrid (inbound webhooks + outbound) |
| Deployment | Docker + cloud provider |

## Project Structure

```
helpdesk/
  client/       # React frontend (Vite, port 5173)
  server/       # Express backend (port 5150)
```

## Key Decisions

- Bun workspaces monorepo — client and server share a single `bun.lock`
- Vite proxies `/api/*` to the Express server — no CORS issues in development
- Single admin seeded on first deploy; admin creates agent accounts

## Tailwind CSS

- Using Tailwind CSS v4 via the `@tailwindcss/vite` plugin — no `tailwind.config.js` needed
- Do not use raw HTML elements with long inline className strings — use shadcn/ui components instead
- Theme tokens (`bg-card`, `text-muted-foreground`, etc.) are defined as CSS custom properties in `index.css`

## shadcn/ui

- Component library built on Radix UI + Tailwind CSS
- Add new components via: `bunx shadcn@latest add <component>` from the `client/` directory
- Components are installed to `client/src/components/ui/`
- Always prefer shadcn/ui components (`Input`, `Card`, `Button`, etc.) over raw HTML elements
- Only use `.tsx` files — never create or maintain `.js` duplicates (Vite resolves `.js` before `.tsx`, causing `.tsx` edits to have no effect)

## Authentication

- Powered by [Better Auth](https://better-auth.com)
- Server config: `server/src/auth.ts` — uses Prisma adapter with PostgreSQL
- Client config: `client/src/lib/auth-client.ts` — `createAuthClient()` from `better-auth/react`
- Email/password auth only; sign-up is disabled (accounts created by admin)
- Users have a `role` field: `admin` or `agent` (default)
- Better Auth context7 library ID: `/better-auth/better-auth`

## Authorization

- `client/src/components/AdminRoute.tsx` guards routes to admin-only users — wrap `<Route>` elements in `App.tsx` with it
- For conditional nav items, check `session?.user.role === "admin"` directly in the component

## Ticket Model

- **Statuses:** open, resolved, closed
- **Categories:** General Question, Technical Question, Refund Request
- **Roles:** admin (full access), agent (ticket work)

## Documentation

When working with any library or framework in this project, use Context7 MCP to fetch current documentation instead of relying on training data.

1. Call `mcp__context7__resolve-library-id` with the library name and your question
2. Pick the best match from results
3. Call `mcp__context7__query-docs` with the selected ID and your question
4. Use the fetched docs for accurate, version-specific answers

Key library IDs for this project:
- Bun: `/oven-sh/bun`
- Express: `/expressjs/express`
- Prisma: `/prisma/prisma`
- React: `/facebook/react`
- Vite: `/vitejs/vite`
- Tailwind CSS: `/tailwindlabs/tailwindcss`
- React Router: `/remix-run/react-router`
- Better Auth: `/better-auth/better-auth`
- shadcn/ui: `/shadcn-ui/ui`
