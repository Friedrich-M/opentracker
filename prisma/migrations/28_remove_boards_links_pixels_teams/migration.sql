-- Shares of removed entity types (2 link, 3 pixel, 4 board) can no longer resolve.
DELETE FROM "share" WHERE "share_type" IN (2, 3, 4);

-- Link and pixel hits were stored as events under the link/pixel id.
DELETE FROM "website_event" WHERE "event_type" IN (3, 4);

-- DropTable
DROP TABLE "board";

-- DropTable
DROP TABLE "link";

-- DropTable
DROP TABLE "pixel";

-- Team-owned websites pass to the team's owner before teams are dropped.
UPDATE "website" SET "user_id" = (
  SELECT "team_user"."user_id" FROM "team_user"
  WHERE "team_user"."team_id" = "website"."team_id" AND "team_user"."role" = 'team-owner'
  ORDER BY "team_user"."created_at"
  LIMIT 1
)
WHERE "user_id" IS NULL AND "team_id" IS NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "website_team_id_idx";

-- AlterTable
ALTER TABLE "website" DROP COLUMN "team_id";

-- DropTable
DROP TABLE "team_user";

-- DropTable
DROP TABLE "team";
