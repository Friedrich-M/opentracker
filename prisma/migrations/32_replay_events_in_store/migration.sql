-- Replay chunk bodies move to the R2 replay store (src/lib/replay-store.ts);
-- rows written there keep events null. Older rows keep their bytes.
ALTER TABLE "session_replay" ALTER COLUMN "events" DROP NOT NULL;
