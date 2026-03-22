import { ClientDetailContent } from '@/features/clients/components/client-detail'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ClientDetailContent clientId={id} />
}
