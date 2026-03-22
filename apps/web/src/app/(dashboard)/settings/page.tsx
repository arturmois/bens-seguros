import { ChannelsPage } from '@/features/channels/components/channels-page'
import { SettingsLayout } from '@/features/channels/components/settings-layout'

export default function SettingsPage() {
  return (
    <SettingsLayout>
      <ChannelsPage />
    </SettingsLayout>
  )
}
