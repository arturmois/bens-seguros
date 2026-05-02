interface DetailInfoItemProps {
  readonly icon?: React.ReactNode
  readonly label: string
  readonly value: string
}

export function DetailInfoItem({ icon, label, value }: DetailInfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      {icon ? <div className="text-muted-foreground mt-0.5">{icon}</div> : null}
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
