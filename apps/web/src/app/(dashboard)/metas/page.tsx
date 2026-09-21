import type { Metadata } from 'next'

import { GoalsContent } from '@/features/goals/components/goals-content'

export const metadata: Metadata = { title: 'Metas' }

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-2xl">Metas</h1>
      <GoalsContent />
    </div>
  )
}
