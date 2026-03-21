import { CommissionsContent } from './commissions-content';

export default function CommissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comissoes</h1>
        <p className="text-muted-foreground text-sm">Gerenciamento de comissoes e aprovacoes.</p>
      </div>
      <CommissionsContent />
    </div>
  );
}
