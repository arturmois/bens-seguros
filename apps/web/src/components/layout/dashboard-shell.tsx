'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useOrgs } from '@/features/org/hooks/use-orgs';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLoading } = useOrgs();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  // TODO: Fetch real role from server when useOrgs includes role data.
  // The actual role enforcement happens server-side via CASL middleware.
  // The frontend role is only used for UI filtering of nav items.
  return <AppShell role="MANAGER">{children}</AppShell>;
}
