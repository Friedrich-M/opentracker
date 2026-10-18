-- AlterTable: the owner's own visits and local previews are recorded but
-- excluded from the dashboard and public counter by default.
ALTER TABLE "website_event" ADD COLUMN "internal" BOOLEAN NOT NULL DEFAULT false;
