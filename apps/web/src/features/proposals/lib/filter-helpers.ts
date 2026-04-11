import {
  ALL_FILTER_VALUE,
  BOARD_TYPES,
  STAGES,
  type BoardType,
  type ProposalStage,
} from './constants'

export function isProposalStage(value: string): value is ProposalStage {
  return (STAGES as readonly string[]).includes(value)
}

export function isBoardType(value: string): value is BoardType {
  return (BOARD_TYPES as readonly string[]).includes(value)
}

export function resolveStageParam(
  stageFilter: string
): ProposalStage | undefined {
  if (stageFilter === ALL_FILTER_VALUE) return undefined
  return isProposalStage(stageFilter) ? stageFilter : undefined
}

export function resolveBoardTypeParam(
  boardTypeFilter: string,
  allowedBoardTypes: readonly BoardType[]
): BoardType | undefined {
  if (boardTypeFilter !== ALL_FILTER_VALUE && isBoardType(boardTypeFilter)) {
    return boardTypeFilter
  }
  return allowedBoardTypes.length === 1 ? allowedBoardTypes[0] : undefined
}
