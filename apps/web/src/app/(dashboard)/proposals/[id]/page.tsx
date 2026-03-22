import { ProposalDetailContent } from './proposal-detail-content'

interface ProposalDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <ProposalDetailContent proposalId={id} />
    </div>
  )
}
