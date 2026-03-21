'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgs } from '@/features/org/hooks/use-orgs';
import { OrgCard } from '@/features/org/components/org-card';

export default function SelectOrgPage() {
  const { orgs, isLoading, switchOrg } = useOrgs();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && orgs.length === 1 && orgs[0]) {
      switchOrg(orgs[0].id);
    }
  }, [isLoading, orgs, switchOrg]);

  useEffect(() => {
    if (!isLoading && orgs.length === 0) {
      router.replace('/onboarding');
    }
  }, [isLoading, orgs.length, router]);

  if (isLoading || orgs.length <= 1) return null;

  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Selecione uma organização</h2>
        <p className="text-muted-foreground mt-1 text-sm">Escolha a corretora que deseja acessar</p>
      </div>
      <div className="space-y-3">
        {orgs.map((org) => (
          <OrgCard key={org.id} org={org} onClick={() => switchOrg(org.id)} />
        ))}
      </div>
    </div>
  );
}
