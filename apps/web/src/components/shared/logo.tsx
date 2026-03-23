interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const SIZES = {
  sm: { icon: 24, text: 'text-sm' },
  md: { icon: 32, text: 'text-lg' },
  lg: { icon: 40, text: 'text-xl' },
} as const

export function Logo({
  size = 'md',
  showText = true,
  className = '',
}: LogoProps): React.ReactElement {
  const { icon, text } = SIZES[size]

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="40" height="40" rx="10" className="fill-primary-600" />
        <text
          x="50%"
          y="52%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-accent-400"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="22"
        >
          B
        </text>
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight ${text}`}>Bens Seguros</span>
      )}
    </span>
  )
}
