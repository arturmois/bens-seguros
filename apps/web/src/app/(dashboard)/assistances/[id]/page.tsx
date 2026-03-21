import { AssistanceDetailContent } from './assistance-detail-content';

interface AssistanceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssistanceDetailPage({ params }: AssistanceDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <AssistanceDetailContent assistanceId={id} />
    </div>
  );
}
