import { PoliciesTable } from '@/features/policies/components/policies-table';

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apólices</h1>
        <p className="text-muted-foreground text-sm">Apólices de seguro emitidas.</p>
      </div>
      <PoliciesTable />
    </div>
  );
}
