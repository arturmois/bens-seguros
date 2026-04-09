interface InfoItemProps {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
}

export function ClientDetailInfo({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
