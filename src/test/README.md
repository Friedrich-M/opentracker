# Test Convention

Vitest runs the unit and component tests (`pnpm test`, part of `pnpm verify`). There is no end-to-end suite; dashboard changes are checked by eye with `pnpm screenshot` (Playwright), per the opentracker-local-preview skill.

- Place tests next to the code they cover as `*.test.ts` or `*.test.tsx`.
- Import Vitest APIs explicitly: `import { describe, expect, test, vi } from 'vitest';`.
- Use `test`, not `it`.
- Component tests that need the app's providers (React Query, intl, Zen, routing) render with `@/test/render`; ones that need none may use Testing Library's `render` directly.
- Prefer accessible Testing Library queries such as `getByRole`, `getByLabelText`, and `getByText`.
- Use `getByTestId` only when there is no useful accessible query. The test id attribute is `data-test`.
- Keep test doubles in the test file unless they are shared framework concerns, such as Next navigation.

## Fixture privacy

Use fabricated identifiers and reserved example domains/IP ranges. Never copy production database rows, visitor labels, cookies, replay payloads or API responses into fixtures. Put browser captures and traces in ignored `artifacts/` or `test-results/`. See [repository data policy](../../docs/repository-data.md).
