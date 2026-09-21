'use client'

interface TypingIndicatorProps {
  readonly typingUser: string | null
}

export function TypingIndicator({ typingUser }: TypingIndicatorProps) {
  if (!typingUser) return null
  return (
    <div className="flex items-center gap-1.5 px-4 py-1 text-muted-foreground text-xs">
      <span>{typingUser} esta digitando</span>
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
      </span>
    </div>
  )
}
