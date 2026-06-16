interface SectionCardProps {
  children: React.ReactNode
  className?: string
  as?: 'section' | 'article' | 'div'
}

export default function SectionCard({
  children,
  className = '',
  as: Tag = 'section',
}: SectionCardProps) {
  return (
    <Tag
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {children}
    </Tag>
  )
}
