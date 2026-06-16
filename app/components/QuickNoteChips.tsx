'use client'

interface QuickNoteChipsProps {
  title: string
  suggestions: string[]
  onSelect: (chip: string) => void
}

export default function QuickNoteChips({ title, suggestions, onSelect }: QuickNoteChipsProps) {
  return (
    <div className="space-y-2 pt-2.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            className="kc-chip rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-100 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
