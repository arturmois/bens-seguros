import { PolicyDetailContent } from './policy-detail-content'

interface PolicyPageProps {
  params: Promise<{ id: string }>
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <PolicyDetailContent policyId={id} />
    </div>
  )
}
