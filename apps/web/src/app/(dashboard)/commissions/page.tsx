import type { Metadata } from 'next'
import { CommissionsContent } from './commissions-content'

export const metadata: Metadata = { title: 'Comissões' }

export default function CommissionsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comissões</h1>
        <p className="text-muted-foreground text-sm">
          Gerenciamento de comissões e aprovações.
        </p>
      </div>
      <CommissionsContent />
    </div>
  )
}
