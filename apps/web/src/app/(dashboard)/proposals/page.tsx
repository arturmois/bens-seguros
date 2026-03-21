import { ProposalsContent } from './proposals-content';

export default function ProposalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
        <p className="text-muted-foreground text-sm">Pipeline de propostas de seguro.</p>
      </div>
      <ProposalsContent />
    </div>
  );
}
