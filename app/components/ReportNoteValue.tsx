interface ReportNoteValueProps {
  value: string
}

function getNoteLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function ReportNoteValue({ value }: ReportNoteValueProps) {
  const lines = getNoteLines(value)

  if (lines.length <= 1) {
    return <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">{lines[0] ?? value}</p>
  }

  return (
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`} className="leading-relaxed">
          {line}
        </li>
      ))}
    </ul>
  )
}
