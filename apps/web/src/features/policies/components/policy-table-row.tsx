'use client'

import { Ban, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Menu, MenuPopup, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/formatters'

import type { PolicyData } from '../types'
import {
  POLICY_BRANCH_LABELS,
  POLICY_STATUS_BADGE_VARIANT,
  POLICY_STATUS_LABELS,
} from '../types'

interface PolicyTableRowProps {
  readonly policy: PolicyData
  readonly onRowClick: (id: string) => void
  readonly onCancelClick: (policy: PolicyData) => void
}

export function PolicyTableRow({
  policy,
  onRowClick,
  onCancelClick,
}: PolicyTableRowProps) {
  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      onClick={() => onRowClick(policy.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRowClick(policy.id)
        }
      }}
    >
      <TableCell className="font-medium">{policy.policyNumber}</TableCell>
      <TableCell>
        <Badge variant="outline">{POLICY_BRANCH_LABELS[policy.branch]}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={POLICY_STATUS_BADGE_VARIANT[policy.status]}>
          {POLICY_STATUS_LABELS[policy.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(policy.premiumValueInCents)}
      </TableCell>
      <TableCell>
        {formatDate(policy.startDate)} – {formatDate(policy.endDate)}
      </TableCell>
      <TableCell>{formatDate(policy.createdAt)}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {policy.status === 'ACTIVE' && (
          <Menu>
            <MenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label={`Ações da apólice ${policy.policyNumber}`}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </MenuTrigger>
            <MenuPopup align="end">
              <MenuItem onClick={() => onCancelClick(policy)}>
                <Ban className="mr-2 size-4" />
                Cancelar
              </MenuItem>
            </MenuPopup>
          </Menu>
        )}
      </TableCell>
    </TableRow>
  )
}
