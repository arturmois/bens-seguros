'use client';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card flex h-14 items-center justify-between border-b px-4">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
        {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
      </Button>

      <div className="flex items-center gap-4">
        <span className="text-muted-foreground text-sm">{user?.name}</span>
        <Button variant="ghost" size="icon" onClick={() => logout.mutate()}>
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
