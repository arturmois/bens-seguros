import { Suspense } from 'react'
import { AcceptInvitationContent } from './content'
import { Loader2 } from 'lucide-react'

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center rounded-lg border bg-card p-8 shadow-sm">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground text-sm">
            Aceitando convite...
          </p>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  )
}
