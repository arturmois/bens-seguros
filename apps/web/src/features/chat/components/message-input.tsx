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
    <div className="border-border bg-card border-t p-2 md:p-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={handleChange}
          placeholder="Digite uma mensagem..."
          aria-label="Mensagem"
          className="bg-muted/50 focus-visible:ring-primary flex-1 border-0 focus-visible:ring-1"
          disabled={disabled}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || disabled}
          aria-label="Enviar mensagem"
          className="bg-primary hover:bg-primary/90 h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
