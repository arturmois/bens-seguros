'use client'

import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from '@repo/core/legal'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTermsAcceptance } from '../hooks/use-terms-acceptance'

export function TermsAcceptanceModal() {
  const { needsReAccept, isLoading, accept } = useTermsAcceptance()
  if (isLoading || !needsReAccept) {
    return null
  }
  function handleAccept() {
    accept.mutate(undefined, {
      onError: () => toast.error('Erro ao aceitar os termos. Tente novamente.'),
    })
  }
  return (
    <Dialog open modal>
      <DialogContent showCloseButton={false} bottomStickOnMobile={false}>
        <DialogHeader>
          <DialogTitle>Atualizamos nossos Termos</DialogTitle>
          <DialogDescription>
            Atualizamos nossos Termos de Uso (v{CURRENT_TERMS_VERSION}) e
            Política de Privacidade (v{CURRENT_PRIVACY_VERSION}). Por favor,
            revise e aceite para continuar utilizando a plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6">
          <Link
            href="/terms"
            target="_blank"
            className="text-accent-400 hover:text-accent-300 text-sm underline"
          >
            Ler Termos de Uso →
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            className="text-accent-400 hover:text-accent-300 text-sm underline"
          >
            Ler Política de Privacidade →
          </Link>
        </div>
        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={accept.isPending}
            className="from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 text-primary-foreground w-full bg-gradient-to-r font-bold sm:w-auto"
          >
            {accept.isPending ? 'Processando...' : 'Li e aceito as alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
