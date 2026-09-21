'use client'

import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

type FormDialogShellSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<FormDialogShellSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-5xl',
}

interface FormDialogShellProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly description?: string
  readonly formId: string
  readonly isPending: boolean
  readonly submitLabel: string
  readonly cancelLabel?: string
  readonly size?: FormDialogShellSize
  readonly showKeyboardHint?: boolean
  readonly keyboardHintAction?: string
  readonly children: ReactNode
}

export function FormDialogShell({
  open,
  onOpenChange,
  title,
  description,
  formId,
  isPending,
  submitLabel,
  cancelLabel = 'Cancelar',
  size = 'md',
  showKeyboardHint = true,
  keyboardHintAction = 'confirmar',
  children,
}: FormDialogShellProps) {
  function handleOpenChange(next: boolean) {
    if (isPending && !next) return
    onOpenChange(next)
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(SIZE_CLASS[size])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogPanel>{children}</DialogPanel>
        <DialogFooter className="flex items-center">
          {showKeyboardHint && (
            <div className="mr-auto flex items-center gap-1 text-muted-foreground text-xs">
              <Kbd>↵</Kbd>
              <span>{keyboardHintAction}</span>
              <span className="opacity-50">·</span>
              <Kbd>Esc</Kbd>
              <span>fechar</span>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
