import { CommissionDetailContent } from './commission-detail-content'

interface CommissionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CommissionDetailPage({
  params,
}: CommissionDetailPageProps) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <CommissionDetailContent commissionId={id} />
    </div>
  )
}
