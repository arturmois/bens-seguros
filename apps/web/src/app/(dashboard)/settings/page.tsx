import type { Metadata } from 'next'
import { AiAgentsPage } from '@/features/ai-agents/components/ai-agents-page'
import { ChannelsPage } from '@/features/channels/components/channels-page'
import { SettingsLayout } from '@/features/channels/components/settings-layout'
import { MembersPage } from '@/features/members/components/members-page'
import { OrganizationPage } from '@/features/organization/components/organization-page'

export const metadata: Metadata = { title: 'Configurações' }

interface SettingsPageProps {
  searchParams: Promise<{ section?: string }>
}

function SettingsContent({ section }: { readonly section: string }) {
  switch (section) {
    case 'agents':
      return <AiAgentsPage />
    case 'members':
      return <MembersPage />
    case 'organization':
      return <OrganizationPage />
    default:
      return <ChannelsPage />
  }
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams
  const section = params.section ?? 'channels'
  return (
    <SettingsLayout activeSection={section}>
      <SettingsContent section={section} />
    </SettingsLayout>
  )
}
