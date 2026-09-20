# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

### L-002 - When a goal promises a byte-identical response body, assert error.message alongside statusCode and code for every mapped error, not only the ones the spec spells out.
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `auth-service` · harmful: 0
- features: mod-1-2-identity-service, mod-1-3-membership-queries
- evidence: M14 packages/auth/src/identity-service.ts:232 (auth-service) (+1 more)
- last seen: 2026-09-14T01:03:27Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Write doc-unchanged acceptance tests as whitespace/format-insensitive diffs because lint-staged runs prettier --write on markdown at commit
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `docs` · harmful: 0
- features: mod-1-0-record-architecture
- evidence: .specs/features/mod-1-0-record-architecture/spec.md:88 (ARCH-12) (docs)
- last seen: 2026-09-13T19:22:40Z

### L-003 - Before scoping a helper move, grep every importer of the helper module and list each one in the spec's in-scope routes and characterization specs.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: mod-1-2-identity-service
- evidence: ID-21/ID-23 corrected in b85f09fe (get-public-invitation.ts imported readCurrentSession) (routes)
- last seen: 2026-09-13T23:44:57Z

### L-004 - When a check names noUnusedVariables ignoring underscore-prefixed names, prove it with a leftover vs _leftover canary, not only that the rule level is error.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `lint` · harmful: 0
- features: phase-1-tooling
- evidence: C7 scripts/biome-tooling.test.mjs mapped lint rules (lint)
- last seen: 2026-09-20T02:58:25Z

### L-005 - When a check enables a class-sort rule for className, assert className is in the rule options attributes, not only that the rule is on.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `lint` · harmful: 0
- features: phase-1-tooling
- evidence: C16 scripts/biome-tooling.test.mjs useSortedClasses (lint)
- last seen: 2026-09-20T02:58:25Z

### L-006 - Assert every conjunct of a compound check; forbidding a leftover stub is not proof the replacement fake was passed in.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: phase-2-composition
- evidence: C11 .specs/features/phase-2-composition/verification.md round 1 (tests)
- last seen: 2026-09-20T14:39:30Z

### L-007 - A named plugin-registration boundary is not proven by registering one inner route of that plugin.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: phase-2-composition
- evidence: C15 apps/server/src/bootstrap/compose.spec.ts:43 round 1 (tests)
- last seen: 2026-09-20T14:39:30Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
