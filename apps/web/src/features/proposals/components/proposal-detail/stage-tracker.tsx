import { KANBAN_STAGES, STAGE_LABELS } from '../../lib/constants'
import type { ProposalStage } from '../../lib/constants'

const STAGES_ORDER = KANBAN_STAGES

type TrackedStage = (typeof KANBAN_STAGES)[number]

type StageState = 'done' | 'current' | 'future' | 'lost'

type StageTrackerVariant = 'default' | 'lost' | 'success'

interface StageTrackerProps {
  readonly currentStage: ProposalStage
  readonly variant: StageTrackerVariant
  readonly hideLabels?: boolean
}

function computeStateFor(
  stage: TrackedStage,
  currentStage: ProposalStage,
  variant: StageTrackerVariant
): StageState {
  if (variant === 'success') {
    return 'done'
  }
  const currentIndex = STAGES_ORDER.findIndex((s) => s === currentStage)
  const stageIndex = STAGES_ORDER.indexOf(stage)
  if (currentIndex === -1) {
    return 'future'
  }
  if (stageIndex < currentIndex) {
    return 'done'
  }
  if (stageIndex === currentIndex) {
    return variant === 'lost' ? 'lost' : 'current'
  }
  return 'future'
}

const SEG_CLASS_BY_STATE: Record<StageState, string> = {
  done: 'bg-success',
  current: 'bg-warning ring-warning/50 ring-2 shadow-md shadow-warning/40',
  future: 'bg-white/20',
  lost: 'bg-destructive',
}

const LABEL_CLASS_BY_STATE: Record<StageState, string> = {
  done: 'text-white/80',
  current: 'text-warning font-semibold',
  future: 'text-white/60',
  lost: 'text-destructive font-semibold',
}

export function StageTracker({
  currentStage,
  variant,
  hideLabels = false,
}: StageTrackerProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {STAGES_ORDER.map((stage) => {
          const state = computeStateFor(stage, currentStage, variant)
          return (
            <div
              key={stage}
              data-testid={`stage-seg-${stage}`}
              data-state={state}
              className={`h-1.5 flex-1 rounded-full transition-colors ${SEG_CLASS_BY_STATE[state]}`}
            />
          )
        })}
      </div>
      {!hideLabels && (
        <div className="flex gap-1.5 text-[11px]">
          {STAGES_ORDER.map((stage) => {
            const state = computeStateFor(stage, currentStage, variant)
            return (
              <span
                key={stage}
                className={`flex-1 text-center ${LABEL_CLASS_BY_STATE[state]}`}
              >
                {STAGE_LABELS[stage]}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
