import { CommissionsContent } from './commissions-content';

export default function CommissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comissões</h1>
        <p className="text-muted-foreground text-sm">Gerenciamento de comissões e aprovações.</p>
      </div>
      <CommissionsContent />
    </div>
  );
}
