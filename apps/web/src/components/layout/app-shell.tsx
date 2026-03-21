'use client';

import type { Role } from '@repo/auth/roles';
import { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface AppShellProps {
  role: Role;
  children: React.ReactNode;
}

export function AppShell({ role, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} collapsed={collapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
