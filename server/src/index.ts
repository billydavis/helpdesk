import express from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

const app = express();
const PORT = process.env.PORT || 5150;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Must be mounted before express.json()
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return res.status(401).json({ error: "Unauthenticated" });
  res.json(session);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
