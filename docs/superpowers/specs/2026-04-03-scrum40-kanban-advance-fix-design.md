# SCRUM-40: Fix Kanban Advance to POLICY_ISSUED

**Date:** 2026-04-03 | **Type:** Bug Fix | **Jira:** SCRUM-40

## Problem

Users cannot advance proposals from PAYMENT to POLICY_ISSUED via kanban drag-and-drop.
Sprint 1 commit `6b09e31` removed `POLICY_ISSUED` from `ADVANCE_TARGETS` as a workaround,
which silently blocks the drag instead of fixing the underlying issue.

The domain layer (`Proposal.advance()`) correctly supports PAYMENT → POLICY_ISSUED transitions.
The original error was likely caused by missing frontend guards against dragging FROM POLICY_ISSUED,
which has since been added (`if (sourceStage === 'POLICY_ISSUED') return`).

## Solution

Re-enable kanban drag to POLICY_ISSUED and provide a smooth UX that opens the issue-policy
sheet immediately after advancing, so users can complete the full flow in one interaction.

## Changes

### 1. `proposal-kanban.tsx` — Re-enable drag to POLICY_ISSUED

- Add `'POLICY_ISSUED'` back to `ADVANCE_TARGETS`
- Add state: `issuePolicyProposalId: string | null`
- In drag-end handler: when target is POLICY_ISSUED and advance succeeds,
  set `issuePolicyProposalId` to open the issue-policy sheet
- Render `<IssuePolicySheet>` at the bottom of the component
- Keep `if (sourceStage === 'POLICY_ISSUED') return` guard

### 2. `kanban-card-detail.tsx` — Show IssuePolicyCard at POLICY_ISSUED

- Import `IssuePolicyCard`
- When `proposal.stage === 'POLICY_ISSUED'`, render IssuePolicyCard
- Need to fetch existing policy for the proposal (use existing query)

### 3. `advance-proposal-stage.spec.ts` — Add PAYMENT → POLICY_ISSUED test

- Test that advancing from PAYMENT stage results in POLICY_ISSUED
- Verify that no new checklist items are created for POLICY_ISSUED stage

## Acceptance Criteria (from PRD)

- [x] Proposta pode ser arrastada de PAYMENT para POLICY_ISSUED no Kanban
- [x] A transição cria a apólice corretamente (sheet opens for policy creation)
- [x] Mensagem de erro clara se checklist estiver incompleto
- [x] Teste unitário cobrindo transição PAYMENT → POLICY_ISSUED

## Risk Assessment

- **Low risk**: Domain layer already supports this transition
- **Guard retained**: `sourceStage === 'POLICY_ISSUED'` prevents infinite advance loops
- **Error handling**: Backend returns clear ChecklistIncompleteError messages, shown via toast
