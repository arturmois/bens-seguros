# Endorsement Insurer Linkage

> Policy insurerId must survive into endorsement proposal snapshots

Entry: `packages/core/src/modules/proposal/application/create-proposal.ts:CreateProposal.createEndorsementProposal()`
Flow: `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts:PrismaPolicyRepository.findById()` → `packages/core/src/modules/policy/infrastructure/policy-mapper.ts:PolicyMapper.toDomain()` → `packages/core/src/modules/proposal/application/create-proposal.ts:CreateProposal.createEndorsementProposal()`

Gotcha:

- `PolicyData` needs `insurerId`; if omitted from `packages/core/src/modules/policy/domain/policy-repository.ts`, the mapper silently drops insurer linkage even though Prisma persists it
- Endorsement creation must copy `policy.insurerId` into both proposal top-level `insurerId` and `sourcePolicySnapshot.insurerId`
- Server proposal OpenAPI response lives in `apps/server/src/routes/v1/proposals/_schemas.ts`; keep it aligned with `packages/core/src/modules/proposal/domain/proposal.ts:Proposal.toJSON()`

Updated: 2026-04-03
