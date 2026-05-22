import {
  AlertTriangle,
  Building2,
  ClipboardList,
  Contact,
  DollarSign,
  FilePen,
  FileText,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Settings,
  Shield,
  Target,
  type LucideIcon,
} from 'lucide-react'

export interface NavConfigItem {
  readonly href: string
  readonly label: string
  readonly icon: LucideIcon
  readonly permission: string | null
}

export const MAIN_NAV: ReadonlyArray<NavConfigItem> = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: null,
  },
  {
    href: '/contacts',
    label: 'Contatos',
    icon: Contact,
    permission: 'clients:read',
  },
  {
    href: '/clients',
    label: 'Clientes',
    icon: IdCard,
    permission: 'clients:read',
  },
  {
    href: '/insurers',
    label: 'Seguradoras',
    icon: Building2,
    permission: 'insurers:read',
  },
  {
    href: '/proposals',
    label: 'Propostas',
    icon: FileText,
    permission: 'proposals:read',
  },
  {
    href: '/endorsements',
    label: 'Endossos',
    icon: FilePen,
    permission: 'proposals:read',
  },
  {
    href: '/policies',
    label: 'Apólices',
    icon: Shield,
    permission: 'policies:read',
  },
  {
    href: '/claims',
    label: 'Sinistros',
    icon: AlertTriangle,
    permission: 'claims:read',
  },
  {
    href: '/assistances',
    label: 'Assistências',
    icon: LifeBuoy,
    permission: 'assistances:read',
  },
  {
    href: '/commissions',
    label: 'Comissões',
    icon: DollarSign,
    permission: 'commissions:read',
  },
  {
    href: '/metas',
    label: 'Metas',
    icon: Target,
    permission: 'goals:read',
  },
]

export const SECONDARY_NAV: ReadonlyArray<NavConfigItem> = [
  { href: '/chat', label: 'Chat', icon: MessageSquare, permission: null },
  {
    href: '/audit',
    label: 'Auditoria',
    icon: ClipboardList,
    permission: 'audit:read',
  },
  {
    href: '/settings',
    label: 'Configurações',
    icon: Settings,
    permission: 'settings:read',
  },
]

export const ALERT_BADGE_MAP: Record<string, string> = {
  '/policies': 'Policy',
  '/claims': 'Claim',
  '/commissions': 'Commission',
  '/proposals': 'Proposal',
}
