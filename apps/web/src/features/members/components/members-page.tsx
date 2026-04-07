'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { isRoleAtLeast } from '@repo/auth/roles'

import { useMembers, useInvitations } from '../hooks/use-members'
import { MembersTable } from './members-table'
import { PendingInvitations } from './pending-invitations'
import { InviteMemberDialog } from './invite-member-dialog'

type ActiveTab = 'members' | 'invitations'

const ADMIN_LEVEL_ROLE = 'ADMIN' as const

export function MembersPage() {
  const { user } = useAuth()
  const { activeOrg } = useOrgs()
  const { data: members } = useMembers()
  const { data: invitations } = useInvitations()

  const [activeTab, setActiveTab] = useState<ActiveTab>('members')
  const [formOpen, setFormOpen] = useState(false)

  const userRole = activeOrg?.role ?? 'VIEWER'
  const canManage = isRoleAtLeast(userRole, ADMIN_LEVEL_ROLE)

  const membersCount = members?.length ?? 0
  const invitationsCount = invitations?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Membros da Equipe
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie os membros e convites da sua organização.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            Convidar
          </Button>
        )}
      </div>

      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        membersCount={membersCount}
        invitationsCount={invitationsCount}
        showInvitations={canManage}
      />

      {activeTab === 'members' && (
        <MembersTable
          canManage={canManage}
          currentUserId={user?.id ?? ''}
          currentUserRole={userRole}
        />
      )}
      {activeTab === 'invitations' && canManage && (
        <PendingInvitations canManage={canManage} />
      )}

      {canManage && (
        <InviteMemberDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          currentUserRole={userRole}
        />
      )}
    </div>
  )
}

interface TabBarProps {
  readonly activeTab: ActiveTab
  readonly onTabChange: (tab: ActiveTab) => void
  readonly membersCount: number
  readonly invitationsCount: number
  readonly showInvitations: boolean
}

function TabBar({
  activeTab,
  onTabChange,
  membersCount,
  invitationsCount,
  showInvitations,
}: TabBarProps) {
  return (
    <div className="flex gap-1">
      <TabButton
        active={activeTab === 'members'}
        onClick={() => onTabChange('members')}
        label="Membros"
        count={membersCount}
      />
      {showInvitations && (
        <TabButton
          active={activeTab === 'invitations'}
          onClick={() => onTabChange('invitations')}
          label="Convites Pendentes"
          count={invitationsCount}
        />
      )}
    </div>
  )
}

interface TabButtonProps {
  readonly active: boolean
  readonly onClick: () => void
  readonly label: string
  readonly count: number
}

function TabButton({ active, onClick, label, count }: TabButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      size="sm"
      onClick={onClick}
      className={cn('gap-1.5', !active && 'text-muted-foreground')}
    >
      {label}
      <Badge variant={active ? 'secondary' : 'outline'} size="sm">
        {count}
      </Badge>
    </Button>
  )
}
