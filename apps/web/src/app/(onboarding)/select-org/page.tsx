import { Suspense } from 'react'
import { SelectOrgContent } from './content'
import { Loader2 } from 'lucide-react'

export default function SelectOrgPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-card flex flex-col items-center rounded-lg border p-8 shadow-sm">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground mt-4 text-sm">
            Carregando organizações...
          </p>
        </div>
      }
    >
      <SelectOrgContent />
    </Suspense>
  )
}
