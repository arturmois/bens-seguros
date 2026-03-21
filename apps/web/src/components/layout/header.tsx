'use client';

import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex h-14 items-center px-4">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
        {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
      </Button>
    </header>
  );
}
