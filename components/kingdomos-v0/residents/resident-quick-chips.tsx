'use client'

interface ResidentQuickChipsProps {
  title: string
  suggestions: string[]
  onSelect: (chip: string) => void
}

export function ResidentQuickChips({
  title,
  suggestions,
  onSelect,
}: ResidentQuickChipsProps) {
  return (
    <div className="space-y-2 pt-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            className="kc-chip rounded-full border border-border bg-secondary/80 px-3.5 py-1.5 text-xs font-medium text-secondary-foreground transition-colors duration-100 hover:border-emerald-400/30 hover:bg-emerald-500/12 hover:text-emerald-200 active:bg-emerald-500/18"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
