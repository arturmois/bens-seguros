import { AiAgentsPage } from '@/features/ai-agents/components/ai-agents-page'
import { ChannelsPage } from '@/features/channels/components/channels-page'
import { SettingsLayout } from '@/features/channels/components/settings-layout'

interface SettingsPageProps {
  searchParams: Promise<{ section?: string }>
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams
  const section = params.section ?? 'canais'

  return (
    <SettingsLayout activeSection={section}>
      {section === 'agentes-ia' ? <AiAgentsPage /> : <ChannelsPage />}
    </SettingsLayout>
  )
}
