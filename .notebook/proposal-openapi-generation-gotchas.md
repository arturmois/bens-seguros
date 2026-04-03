# proposal-openapi-generation-gotchas

- The OpenAPI doc at `http://localhost:3001/api/docs/openapi.json` stayed on the old proposal query contract until the server was restarted with the parent checkout `.env`.
- `pnpm --filter @app/web generate:api` can still finish with generated files even when the after-write prettier hook fails on `apps/web/src/api/endpoints/default/default.ts`.
- The broken `default/` output is not used by the proposal client; remove it after generation so the worktree stays focused on the real API surface.
