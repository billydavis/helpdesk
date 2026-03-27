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
- Database sessions stored in PostgreSQL — no third-party auth service
- Single admin seeded on first deploy; admin creates agent accounts

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
