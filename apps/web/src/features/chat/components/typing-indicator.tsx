'use client'

interface TypingIndicatorProps {
  readonly typingUser: string | null
}

export function TypingIndicator({ typingUser }: TypingIndicatorProps) {
  if (!typingUser) return null
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 px-4 py-1 text-xs">
      <span>{typingUser} esta digitando</span>
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full [animation-delay:0ms]" />
        <span className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full [animation-delay:150ms]" />
        <span className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full [animation-delay:300ms]" />
      </span>
    </div>
  )
}
