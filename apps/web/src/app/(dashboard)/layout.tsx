import { DashboardShell } from '@/components/layout/dashboard-shell'
import { BillingBanners } from '@/features/billing/components/billing-banners'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      <BillingBanners />
      {children}
    </DashboardShell>
  )
}
