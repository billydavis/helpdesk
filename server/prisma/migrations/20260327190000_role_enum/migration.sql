DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('admin', 'agent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING "role"::"Role";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'agent'::"Role";
