import { AiAgentsPage } from '@/features/ai-agents/components/ai-agents-page'
import { ChannelsPage } from '@/features/channels/components/channels-page'
import { SettingsLayout } from '@/features/channels/components/settings-layout'
import { MembersPage } from '@/features/members/components/members-page'

interface SettingsPageProps {
  searchParams: Promise<{ section?: string }>
}

function SettingsContent({ section }: { readonly section: string }) {
  switch (section) {
    case 'agentes-ia':
      return <AiAgentsPage />
    case 'membros':
      return <MembersPage />
    default:
      return <ChannelsPage />
  }
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams
  const section = params.section ?? 'canais'

  return (
    <SettingsLayout activeSection={section}>
      <SettingsContent section={section} />
    </SettingsLayout>
  )
}
