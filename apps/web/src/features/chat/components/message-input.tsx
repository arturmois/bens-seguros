'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'

interface MessageInputProps {
  readonly onSendMessage: (text: string) => void
  readonly onEmitTyping: () => void
  readonly disabled: boolean
}

export function MessageInput({
  onSendMessage,
  onEmitTyping,
  disabled,
}: MessageInputProps) {
  const [inputValue, setInputValue] = useState('')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    onEmitTyping()
  }
  return (
    <div className="border-border border-t bg-card p-2 md:p-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={handleChange}
          placeholder="Digite uma mensagem..."
          aria-label="Mensagem"
          className="flex-1 border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary"
          disabled={disabled}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || disabled}
          aria-label="Enviar mensagem"
          className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
