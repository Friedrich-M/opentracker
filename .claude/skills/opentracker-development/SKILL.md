---
name: opentracker-development
description: Implement or refactor OpenTracker features across collection, dashboard, APIs and storage, selecting the relevant project contracts and verification. Use for OpenTracker code changes; deployment and screenshot-only tasks have separate skills.
---

# Develop OpenTracker

Read the repository’s `AGENTS.md` first. Use `docs/development.md` for setup and checks, and inspect package scripts for current commands. Paths here are relative to the repository root.

## Choose the contracts affected

Trace the requested behavior through its callers and tests before editing. For collection, sharing or storage changes, read the relevant section of `docs/architecture.md`; website integration behavior is in `docs/site-integration.md`. For dashboard work, read `docs/design.md`. Avoid loading every guide when only one boundary changes.

Permission changes must cover website ownership, administrator access and share-token access separately. A share response must not reveal visitor network fields indirectly through filters or search. Collection overrides need an authenticated sender. Treat these as observable behavior in tests.

For SQL changes, add a migration rather than editing an applied one and exercise it on a disposable database. Account for raw queries as well as Prisma. API changes need the colocated contracts and OpenAPI generation described in `src/openapi/README.md`.

## Implement and verify

Keep changes within the established framework structure. Extract shared code only when real callers benefit; do not create a new abstraction or move routes just to make the tree look uniform. Keep the `tracker` integration names stable.

Use synthetic fixtures. When the source checkout is cloud-synced, use the source-only scratch workflow in `.claude/skills/opentracker-local-preview/SKILL.md`; do not install there or copy ignored configuration into the scratch copy.

Run the development guide’s required checks. Add a focused regression test for behavior changed by the task. Use the local-preview skill for UI or database verification; a unit suite does not prove browser behavior or live persistence.

If a check fails, separate a change regression from a setup problem and fix the cause. Do not suppress a check, broaden permissions or substitute production data to get a pass. Stop any local services you started after verification.

## Finish

Update the reference doc that owns the behavior. Keep `AGENTS.md` around 100 lines and free of scan-derived inventories; write Markdown prose without hard wraps. Keep `CHANGELOG.md` ignored.

Report changed behavior, validation and remaining limitations. Commit, push or deploy only if the request authorizes it; this skill does not grant those permissions.
