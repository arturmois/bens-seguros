'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useOrgs } from '@/features/org/hooks/use-orgs';
import { getOrgInitials, getOrgColor } from '@/lib/org-avatar';
import { cn } from '@/lib/utils';

interface OrgSwitcherProps {
  collapsed: boolean;
}

export function OrgSwitcher({ collapsed }: OrgSwitcherProps) {
  const { orgs, activeOrg, switchOrg } = useOrgs();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSwitch(orgId: string) {
    setOpen(false);
    if (orgId !== activeOrg?.id) {
      switchOrg(orgId);
    }
  }

  function handleCreateNew() {
    setOpen(false);
    router.push('/onboarding?new=true');
  }

  if (!activeOrg) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'hover:bg-muted flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors',
          collapsed && 'justify-center px-0',
        )}
      >
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: getOrgColor(activeOrg.id) }}
        >
          {getOrgInitials(activeOrg.name)}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{activeOrg.name}</div>
              {activeOrg.role && (
                <div className="text-muted-foreground truncate text-xs">{activeOrg.role}</div>
              )}
            </div>
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align={collapsed ? 'start' : 'center'}
        side={collapsed ? 'right' : 'bottom'}
      >
        <div className="space-y-1">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSwitch(org.id)}
              className={cn(
                'hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                org.id === activeOrg.id && 'bg-muted',
              )}
            >
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ backgroundColor: getOrgColor(org.id) }}
              >
                {getOrgInitials(org.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{org.name}</div>
                {org.role && (
                  <div className="text-muted-foreground truncate text-xs">{org.role}</div>
                )}
              </div>
              {org.id === activeOrg.id && <Check className="text-primary size-4 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="border-border mt-1 border-t pt-1">
          <button
            type="button"
            onClick={handleCreateNew}
            className="text-primary hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors"
          >
            <div className="border-primary flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-dashed">
              <Plus className="size-3.5" />
            </div>
            <span className="font-medium">Criar nova organização</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
