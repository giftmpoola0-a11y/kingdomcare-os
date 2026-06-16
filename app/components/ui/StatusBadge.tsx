interface StatusBadgeProps {
  label: string
  colorClass?: string
}

export default function StatusBadge({
  label,
  colorClass = 'bg-slate-100 text-slate-600',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${colorClass}`}
    >
      {label}
    </span>
  )
}
