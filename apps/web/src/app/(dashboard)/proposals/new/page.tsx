import { NewProposalContent } from './new-proposal-content'

export default function NewProposalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Nova Proposta</h1>
        <p className="text-muted-foreground text-sm">
          Crie uma nova proposta de seguro.
        </p>
      </div>
      <NewProposalContent />
    </div>
  )
}
