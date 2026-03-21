import { ClaimsContent } from './claims-content';

export default function ClaimsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sinistros</h1>
        <p className="text-muted-foreground text-sm">
          Gerenciamento de sinistros e acompanhamento de ocorrências.
        </p>
      </div>
      <ClaimsContent />
    </div>
  );
}
