-- AlterTable
ALTER TABLE "session" ADD COLUMN "ip" VARCHAR(45),
ADD COLUMN "asn" INTEGER,
ADD COLUMN "org" VARCHAR(100);

-- CreateIndex
CREATE INDEX "session_website_id_created_at_org_idx" ON "session"("website_id", "created_at", "org");
