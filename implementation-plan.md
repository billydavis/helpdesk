# Implementation Plan

## Phase 1 — Project Setup

- [ ] Initialise backend: Node.js + Express + TypeScript project structure
- [ ] Initialise frontend: React + TypeScript + Tailwind CSS + React Router
- [ ] Configure Docker and docker-compose for local development (app + PostgreSQL)
- [ ] Set up Prisma with PostgreSQL connection
- [ ] Define initial Prisma schema (User, Session, Ticket tables)
- [ ] Run first migration and verify database connectivity
- [ ] Set up environment variable handling (.env, validation on startup)

## Phase 2 — Authentication & User Management

- [ ] Implement database session model (sessions table, create/destroy/validate)
- [ ] Build auth middleware for protected Express routes
- [ ] Seed script: create the initial admin account on first deploy
- [ ] POST /auth/login and POST /auth/logout endpoints
- [ ] GET /auth/me endpoint (return current session user)
- [ ] Admin: POST /users — create agent accounts
- [ ] Admin: GET /users — list all users
- [ ] Admin: DELETE /users/:id — deactivate an agent
- [ ] Frontend: login page
- [ ] Frontend: protected route wrapper
- [ ] Frontend: user management page (admin only)

## Phase 3 — Ticket Core

- [ ] Prisma schema: Ticket (id, subject, body, status, category, createdAt, updatedAt)
- [ ] POST /tickets — create a ticket manually
- [ ] GET /tickets — list tickets with filtering (status, category) and sorting
- [ ] GET /tickets/:id — ticket detail
- [ ] PATCH /tickets/:id — update status or category
- [ ] DELETE /tickets/:id — delete a ticket (admin only)
- [ ] Frontend: ticket list page with filter and sort controls
- [ ] Frontend: ticket detail page
- [ ] Frontend: manual ticket creation form

## Phase 4 — Email Integration

- [ ] Configure SendGrid inbound parse webhook
- [ ] POST /webhooks/email — receive inbound emails and create tickets
- [ ] Validate and sanitise inbound webhook payload
- [ ] POST /tickets/:id/reply — send outbound reply via SendGrid
- [ ] Store sent replies against the ticket (Reply table in Prisma)
- [ ] Frontend: reply composer on ticket detail page
- [ ] Frontend: reply history/thread view on ticket detail page

## Phase 5 — AI Features

- [ ] Integrate Anthropic Claude API (SDK setup, API key config)
- [ ] AI classification: on ticket create, call Claude to assign a category
- [ ] AI summary: generate a short summary for each ticket
- [ ] AI suggested reply: generate a draft reply based on ticket content
- [ ] Store AI outputs on the ticket (classification, summary, suggestedReply fields)
- [ ] Allow agents to accept, edit, or discard the suggested reply
- [ ] Frontend: display AI summary on ticket detail page
- [ ] Frontend: display suggested reply in the reply composer with accept/edit flow

## Phase 6 — Dashboard & Polish

- [ ] GET /dashboard/stats — ticket counts by status and category
- [ ] Frontend: dashboard page with summary stats
- [ ] Frontend: navigation and layout shell (sidebar/header)
- [ ] Error handling and validation across all API endpoints
- [ ] Loading and error states across all frontend pages
- [ ] Pagination for ticket list
- [ ] End-to-end test of the full email → ticket → AI reply → send flow
