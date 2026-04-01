# Helpdesk — AI-Powered Ticket Management System

Course project for [Claude Code — Code with Mosh](https://codewithmosh.com/p/claude-code).

## What We're Building

A support ticket management system that takes the grind out of handling customer emails. Instead of agents manually reading, categorising, and typing out responses to hundreds of emails a day, the system does the heavy lifting:

- **Inbound emails** are automatically ingested via SendGrid webhooks and turned into tickets
- **Claude AI** classifies each ticket, writes a summary, and drafts a suggested reply
- **Agents** review, edit, and send replies — spending time on complex issues rather than routine triage
- **Admins** manage agent accounts and have full oversight of all tickets

## Features

| Feature | Description |
|---|---|
| Email ingestion | Inbound emails arrive via SendGrid webhook and become tickets automatically |
| AI classification | Claude assigns a category (General, Technical, Refund) to each ticket |
| AI summaries | One-paragraph summary generated per ticket |
| AI suggested replies | Draft reply pre-populated in the reply composer for agents to accept or edit |
| Ticket management | Filter and sort by status/category; update status; delete (admin only) |
| Reply threading | Full reply history stored and displayed per ticket |
| User management | Admin can create, view, and deactivate agent accounts |
| Dashboard | At-a-glance stats on ticket volume by status and category |
| Role-based access | Admin and Agent roles with separate permissions |

## Ticket Lifecycle

```
Inbound email → Ticket created → AI classifies + summarises + drafts reply
                                        ↓
                            Agent reviews suggested reply
                                        ↓
                     Agent edits/accepts → Reply sent via SendGrid
                                        ↓
                              Ticket marked Resolved → Closed
```

**Statuses:** Open · Resolved · Closed
**Categories:** General Question · Technical Question · Refund Request

## Tech Stack

| Concern | Choice |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Runtime / Package Manager | Bun |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Better Auth (database sessions) |
| AI | Anthropic Claude API |
| Email | SendGrid (inbound webhooks + outbound) |
| Testing | Playwright (E2E) |
| Deployment | Docker + cloud provider |

## Project Structure

```
helpdesk/
  client/       # React frontend (Vite, port 5173)
  server/       # Express backend (port 5150)
  e2e/          # Playwright end-to-end tests
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://www.docker.com) (for PostgreSQL)
- A [SendGrid](https://sendgrid.com) account (for email features)
- An [Anthropic](https://console.anthropic.com) API key (for AI features)

### Setup

```bash
# Install dependencies
bun install

# Copy and fill in environment variables
cp server/.env.example server/.env

# Start the database
docker compose up -d

# Run database migrations and seed the admin account
cd server && bunx prisma migrate dev && bun run seed

# Start the dev servers (client + server)
bun run dev
```

The app will be available at `http://localhost:5173`.
Default admin credentials are set in `server/.env` via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

### Running Tests

```bash
bun run test:e2e
```

## Roles

- **Admin** — seeded on first deploy; creates and manages agent accounts; full ticket access
- **Agent** — handles day-to-day ticket work; no access to user management
