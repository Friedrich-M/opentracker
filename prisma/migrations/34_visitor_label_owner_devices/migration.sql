-- AlterTable: devices at a labelled IP that are the owner's own, as a JSON
-- array of { "os", "screen" }; collection stores their visits as internal.
ALTER TABLE "visitor_label" ADD COLUMN "owner_devices" JSONB;
