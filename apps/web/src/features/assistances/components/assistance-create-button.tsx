import { Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function AssistanceCreateButton() {
  return (
    <Button render={<Link href="/assistances/new" />}>
      <Plus className="size-4" />
      Nova Assistência
    </Button>
  )
}
