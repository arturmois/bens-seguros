import { Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function ClaimCreateButton() {
  return (
    <Button render={<Link href="/claims/new" />}>
      <Plus className="size-4" />
      Novo Sinistro
    </Button>
  )
}
