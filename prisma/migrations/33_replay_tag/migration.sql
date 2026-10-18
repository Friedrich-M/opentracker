-- Each replay chunk comes from one page load; its tag is that page's
-- data-tag (its project), so a project view plays only its own pages.
ALTER TABLE "session_replay" ADD COLUMN "tag" VARCHAR(50);

-- Earlier chunks take the tag of the visit's latest page view received
-- before the chunk (server clocks on both sides), else its first page view.
UPDATE "session_replay" sr
SET "tag" = COALESCE(
  (SELECT e."tag" FROM "website_event" e
   WHERE e."website_id" = sr."website_id" AND e."visit_id" = sr."visit_id"
     AND e."event_type" = 1 AND e."created_at" <= sr."created_at"
   ORDER BY e."created_at" DESC LIMIT 1),
  (SELECT e."tag" FROM "website_event" e
   WHERE e."website_id" = sr."website_id" AND e."visit_id" = sr."visit_id"
     AND e."event_type" = 1
   ORDER BY e."created_at" ASC LIMIT 1)
);
