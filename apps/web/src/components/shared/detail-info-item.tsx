interface DetailInfoItemProps {
  readonly icon?: React.ReactNode
  readonly label: string
  readonly value: string
}

export function DetailInfoItem({ icon, label, value }: DetailInfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      {icon ? <div className="mt-0.5 text-muted-foreground">{icon}</div> : null}
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium text-sm">{value}</p>
      </div>
    </div>
  )
}
