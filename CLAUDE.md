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

## Data Fetching

- Use **axios** for all HTTP requests — never use `fetch` directly
- Use **TanStack Query** (`@tanstack/react-query`) for all server state in React components
  - `useQuery` for reads, `useMutation` for writes
  - Always call `queryClient.invalidateQueries` on mutation success to keep data fresh
- `QueryClientProvider` is set up in `client/src/main.tsx`

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

## Component & Unit Testing

- **Framework**: Vitest + React Testing Library
- **Run tests**: `bun run test` from the `client/` directory (or `test:watch` for watch mode)
- Test files live in `client/src/test/` and use the `.test.tsx` extension
- Use `renderWithProviders` from `client/src/test/render.tsx` to render components — it wraps with `QueryClientProvider`
- Use **MSW** (`msw/node`) to intercept and mock API calls — never mock axios or TanStack Query internals directly
  - Define handlers with `http.get/post/delete` from `msw`
  - Call `server.resetHandlers()` in `afterEach` and `server.close()` in `afterAll`
  - Override handlers per-test with `server.use(...)` for error and edge cases
- Use `userEvent` (not `fireEvent`) for simulating user interactions
- Query the DOM with accessible queries (`getByRole`, `getByLabelText`, `getByText`) — avoid `getByTestId`

## E2E Testing

Use the `playwright-e2e-writer` agent for all Playwright test writing. Do not write e2e tests directly — delegate to the agent.

## Rate Limiting

- Express rate limiters are gated on `process.env.NODE_ENV === "production"` (see `server/src/index.ts`)
- Disabled in development and test environments — Playwright sets `NODE_ENV=test` for the server subprocess
- When adding new rate-limited routes, follow the `...(isProduction ? [limiter] : [])` spread pattern

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
- TanStack Query: `/tanstack/query`
- Axios: `/axios/axios`
