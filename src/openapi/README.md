# OpenAPI contracts

The app generates `public/openapi.json` for every App Router API handler. It statically infers a baseline contract from route source and replaces that baseline with a colocated, Zod-backed contract wherever one exists.

`public/openapi.json` is an ignored build artifact and must not be committed. Generate it locally with `pnpm openapi:generate` before running checks.

## Commands

- `pnpm openapi:generate` regenerates the public OpenAPI document.
- `pnpm openapi:contracts` refreshes source-controlled contracts for routes without a curated `contract.ts` module.
- `pnpm openapi:check` validates contract alignment and checks that the generated file is current.
- `pnpm openapi:check --explicit` also fails while any non-OPTIONS API route lacks a hand-authored contract.
- `pnpm openapi:check --verbose` lists operations that still use inferred contracts.

The build runs the generator before the Next.js build; `pnpm verify` generates the artifact and runs the check before typecheck and tests.

## Adding an operation

Run `pnpm openapi:contracts` to create a `contract.generated.ts` next to every route that does not have a curated contract. Generated contracts use the route's Zod request validation and TypeScript response types. They are checked in so operation IDs and client-facing schemas remain stable.

For examples or runtime-shared Zod response models, replace the generated module with a `contract.ts` that exports an `operations` array. Define request and response shapes with Zod, and import the same request schema into the route handler for `parseRequest` validation.

Contract modules must remain safe to import from a build script. They must not import route handlers, database clients, or modules with environment-dependent side effects.

The generated artifact contains all audiences. Every operation declares one of:

- `public` operations are intended for API consumers.
- `internal` operations support the dashboard or deployment.
- `collect` operations identify tracker ingestion APIs.

Route paths and HTTP methods are discovered independently from `src/app/api/**/route.ts`. The check requires all discovered non-OPTIONS operations in the artifact and rejects duplicate contracts, duplicate operation IDs, orphaned contracts, and mismatched dynamic path parameters.

New operations are initially marked with `x-tracker-contract: inferred` and their source file. The inference layer extracts path parameters, Zod request fields, authentication, typed response bodies, response status helpers, and response media types without importing route modules. Running `pnpm openapi:contracts` snapshots that behavior into an explicit contract. Curated `contract.ts` modules remain the way to add examples and custom operation IDs.

## Summaries and descriptions

Edit `src/openapi/operation-descriptions.ts` to maintain plain-language documentation without maintaining a full contract. This file is hand-written, committed, and never overwritten by either OpenAPI generator. Keys combine the uppercase HTTP method and the OpenAPI path:

```ts
'GET /api/websites/{websiteId}/shares': {
  summary: 'List website shares',
  description: 'Returns the public share links configured for the website.',
},
```

The document builder applies these fields after loading explicit and inferred contracts. A summary is required for each entry; the longer description is optional. Omitted fields retain their contract values, and operations without an entry retain their existing documentation. Schemas and operation IDs continue to come from the contracts.

Run `pnpm openapi:generate` after editing to refresh the OpenAPI document. Generation and `pnpm openapi:check` reject entries that do not match a discovered route and method. Entries are optional, so documentation can be improved incrementally.

Field documentation lives in `src/openapi/field-descriptions.ts`. The document builder fills missing query/path parameter and request/response property descriptions after converting contracts to OpenAPI, including nested schemas and shared components. Existing contract descriptions take precedence. Keep shared wording limited to fields with consistent meanings; use endpoint-specific wording for fields whose meaning differs between endpoints. Unknown fields are left undocumented rather than given an automatically generated label. Examples and schema validation rules are not modified. Run `pnpm openapi:generate` after editing this file as well.

## Operation IDs

Operation IDs are public: API consumers and generated clients use them as method names. Routes with a curated `contract.ts` set `operationId` directly. For inferred contracts, `src/openapi/operation-ids.ts` overrides the mechanical path-based name (`getWebsitesWebsiteIdStats` -> `getWebsiteStats`). Never rename an operation ID without a migration note for the client.
