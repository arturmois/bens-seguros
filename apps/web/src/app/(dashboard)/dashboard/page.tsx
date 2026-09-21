import type { Metadata } from 'next'
import { DashboardContent } from '@/features/dashboard/components/dashboard-content'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-2xl">Dashboard</h1>
      <DashboardContent />
    </div>
  )
}
