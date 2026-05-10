'use client'

import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const CHAT_SERVER_URL =
  process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:3002'

interface EmbedCodeDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly channelId: string | null
}

function buildEmbedSnippet(channelId: string): string {
  return `<script src="${CHAT_SERVER_URL}/widget/embed.js" data-channel-id="${channelId}" defer></script>`
}

export function EmbedCodeDialog({
  open,
  onOpenChange,
  channelId,
}: EmbedCodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const snippet = channelId ? buildEmbedSnippet(channelId) : ''
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [snippet])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Código de Incorporação</DialogTitle>
          <DialogDescription>
            Copie e cole este código no HTML do seu site para exibir o widget de
            chat.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="bg-muted relative rounded-lg p-4">
            <pre className="text-foreground overflow-x-auto text-sm leading-relaxed">
              <code>{snippet}</code>
            </pre>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copiar código
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
