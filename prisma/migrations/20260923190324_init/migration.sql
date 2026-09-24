-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('notification', 'alert');

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "text_fi" TEXT NOT NULL,
    "text_en" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'notification',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "link" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Keep updated_at current on any UPDATE, including plain SQL statements
-- run outside of Prisma Client (which only sets it client-side)
CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON "notifications"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
