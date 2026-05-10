'use client'

import { Calendar, MapPin, Shield, User } from 'lucide-react'

import { DetailInfoItem } from '@/components/shared/detail-info-item'
import { formatDate } from '@/lib/formatters'

import type { ClaimData } from '../lib/types'

interface ClaimInfoGridProps {
  readonly claim: ClaimData
}

export function ClaimInfoGrid({ claim }: ClaimInfoGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DetailInfoItem
        icon={<User className="h-4 w-4" />}
        label="Cliente"
        value={claim.clientName ?? claim.clientId}
      />
      <DetailInfoItem
        icon={<Shield className="h-4 w-4" />}
        label="Apólice"
        value={claim.policyNumber ?? claim.policyId}
      />
      <DetailInfoItem
        icon={<Shield className="h-4 w-4" />}
        label="Seguradora"
        value={claim.insurerName ?? claim.insurerId ?? '-'}
      />
      <DetailInfoItem
        icon={<User className="h-4 w-4" />}
        label="Responsável"
        value={claim.assignedToName ?? claim.assignedToId ?? '-'}
      />
      <DetailInfoItem
        icon={<Calendar className="h-4 w-4" />}
        label="Data de Registro"
        value={formatDate(claim.reportedAt)}
      />
      <DetailInfoItem
        icon={<Calendar className="h-4 w-4" />}
        label="Data do Incidente"
        value={claim.incidentDate ? formatDate(claim.incidentDate) : '-'}
      />
      <DetailInfoItem
        icon={<MapPin className="h-4 w-4" />}
        label="Local do Incidente"
        value={claim.incidentLocation ?? '-'}
      />
      <DetailInfoItem
        icon={<Calendar className="h-4 w-4" />}
        label="Resolvido em"
        value={claim.resolvedAt ? formatDate(claim.resolvedAt) : '-'}
      />
      <DetailInfoItem
        icon={<Calendar className="h-4 w-4" />}
        label="Encerrado em"
        value={claim.closedAt ? formatDate(claim.closedAt) : '-'}
      />
    </div>
  )
}
