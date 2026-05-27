import { DashboardShell } from '@/components/layout/dashboard-shell'
import { BillingBanners } from '@/features/billing/components/billing-banners'
import { BillingExpiredGuard } from '@/features/billing/components/billing-expired-guard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      <BillingExpiredGuard />
      <BillingBanners />
      {children}
    </DashboardShell>
  )
}
