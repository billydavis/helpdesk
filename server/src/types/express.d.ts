import type { auth } from "../auth";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

declare global {
  namespace Express {
    interface Request {
      authSession?: NonNullable<Session>;
    }
  }
}
