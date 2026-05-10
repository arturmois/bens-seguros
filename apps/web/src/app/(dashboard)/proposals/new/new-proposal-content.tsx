'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ProposalForm } from '@/features/proposals/components/proposal-form'

export function NewProposalContent() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    setOpen(true)
  }, [])
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      router.push('/proposals')
    }
  }
  return <ProposalForm open={open} onOpenChange={handleOpenChange} />
}
