---
name: Route protection behavior
description: How ProtectedRoute and AdminRoute redirect in the React app
type: project
---

**ProtectedRoute** (`client/src/components/ProtectedRoute.tsx`):
- Wraps all routes under the Layout (i.e., `/` and `/users`)
- If no session → `<Navigate to="/login" replace />`
- While session loading → renders `<div>Loading...</div>`

**AdminRoute** (`client/src/components/AdminRoute.tsx`):
- Wraps `/users` inside the ProtectedRoute
- If no session → `<Navigate to="/login" replace />`
- If session but `role !== "admin"` → `<Navigate to="/" replace />`

**Redirect expectations for tests:**
| Scenario | Expected URL |
|---|---|
| Unauthenticated → `/` | `/login` |
| Unauthenticated → `/users` | `/login` |
| Unauthenticated → any unknown path | `/login` (ProtectedRoute catches it) |
| Agent → `/users` | `/` (AdminRoute redirects) |
| Admin → `/users` | `/users` (access granted) |
| Authenticated → `/login` | `/` (LoginPage redirects via `if (session) return <Navigate to="/" />`) |

**Note on arbitrary deep paths:** React Router has no catch-all route, so `/some/deep/route` still hits the ProtectedRoute wrapper and redirects to `/login`.
