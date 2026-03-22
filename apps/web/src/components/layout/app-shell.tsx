'use client'

import type { Role } from '@repo/auth/roles'
import { useCallback, useEffect, useState } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'

interface AppShellProps {
  role: Role
  children: React.ReactNode
}

export function AppShell({ role, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev)
    } else {
      setCollapsed((prev) => !prev)
    }
  }, [isMobile])

  const handleMobileClose = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex h-screen overflow-hidden">
      {isMobile ? (
        <Sidebar
          role={role}
          collapsed={false}
          mobileOpen={mobileOpen}
          onMobileClose={handleMobileClose}
        />
      ) : (
        <Sidebar role={role} collapsed={collapsed} />
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          collapsed={isMobile ? true : collapsed}
          onToggleSidebar={handleToggle}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
