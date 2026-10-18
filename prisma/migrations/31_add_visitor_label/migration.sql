-- CreateTable: the owner's names for recurring visitors, keyed by IP address
-- (StatCounter's "label a visitor"). One label per user and IP.
CREATE TABLE "visitor_label" (
    "visitor_label_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "visitor_label_pkey" PRIMARY KEY ("visitor_label_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visitor_label_user_id_ip_key" ON "visitor_label"("user_id", "ip");

-- CreateIndex
CREATE INDEX "session_ip_idx" ON "session"("ip");
