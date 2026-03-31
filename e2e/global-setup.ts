import { execSync } from "child_process";
import { Client } from "pg";
import path from "path";

const SERVER_DIR = path.resolve(__dirname, "../server");

export default async function globalSetup() {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  const dbName = dbUrl.pathname.slice(1);

  // Connect to the default postgres DB to manage the test database
  const adminUrl = new URL(process.env.DATABASE_URL!);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  // Drop and recreate for a clean slate on every run
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );
  if (exists.rowCount! > 0) {
    // Terminate any open connections before dropping
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [dbName]
    );
    await client.query(`DROP DATABASE "${dbName}"`);
  }
  await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();

  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL!,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL!,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD!,
  };

  // Apply all migrations to the fresh test database
  execSync("bunx prisma migrate deploy", { cwd: SERVER_DIR, env, stdio: "inherit" });

  // Seed the admin user
  execSync("bun run src/seed.ts", { cwd: SERVER_DIR, env, stdio: "inherit" });
}
