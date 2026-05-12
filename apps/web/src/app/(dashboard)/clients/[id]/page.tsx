import { redirect } from 'next/navigation'

import { ClientDetailContent } from '@/features/clients/components/client-detail'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (id === 'new') redirect('/clients')
  return <ClientDetailContent clientId={id} />
}
