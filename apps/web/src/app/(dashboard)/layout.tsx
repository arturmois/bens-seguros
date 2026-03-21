import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="MANAGER">{children}</AppShell>;
}
