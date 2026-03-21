'use client';

import { getOrgInitials, getOrgColor } from '@/lib/org-avatar';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Org } from '@/features/org/hooks/use-orgs';

interface OrgCardProps {
  org: Org;
  onClick: () => void;
}

export function OrgCard({ org, onClick }: OrgCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:border-primary focus-visible:ring-ring flex w-full items-center gap-4 rounded-lg border bg-white p-4 text-left transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 dark:bg-transparent"
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: getOrgColor(org.id) }}
      >
        {getOrgInitials(org.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{org.name}</div>
        <div className="text-muted-foreground text-xs">{org.slug}</div>
      </div>
      {org.role && (
        <Badge variant="outline" size="sm">
          {org.role}
        </Badge>
      )}
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </button>
  );
}
