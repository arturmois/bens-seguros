import type { Metadata } from 'next'

import { GoalsContent } from '@/features/goals/components/goals-content'

export const metadata: Metadata = { title: 'Metas' }

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Metas</h1>
      <GoalsContent />
    </div>
  )
}
