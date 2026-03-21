import { NewProposalContent } from './new-proposal-content';

export default function NewProposalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova Proposta</h1>
        <p className="text-muted-foreground text-sm">Crie uma nova proposta de seguro.</p>
      </div>
      <NewProposalContent />
    </div>
  );
}
