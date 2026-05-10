import { ClaimDetailContent } from './claim-detail-content'

interface ClaimDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClaimDetailPage({
  params,
}: ClaimDetailPageProps) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <ClaimDetailContent claimId={id} />
    </div>
  )
}
