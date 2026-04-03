# Endorsement Flow Entry Points

> Operational endorsement creation is a policy-level CTA; manual endorsement records stay in policy tabs as history.

UI entry points:

- `apps/web/src/features/policies/components/policy-detail.tsx` shows `Criar Endosso` only when the policy is `ACTIVE`.
- `apps/web/src/features/proposals/components/endorsement-proposal-sheet.tsx` creates an endorsement proposal with `boardType: 'ENDORSEMENT'`, `sourcePolicyId`, `endorsementType`, and `endorsementReason`, then redirects to `/endorsements`.
- `apps/web/src/features/policies/components/policy-tabs.tsx` keeps the legacy `EndorsementForm` / `EndorsementList` flow, but labels it as `Registros de Endosso` and `Registrar Endosso Histórico`.

Updated: 2026-04-03
