import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatNumber } from '../lib/utils'

/** Big number tile used across the dashboards: navy numeral, mint rule, small label. */
export function StatTile({ label, value, hint, accent, index = 0 }: { label: string; value: number | string | null; hint?: string; accent?: boolean; index?: number }) {
  const shown = value === null ? '—' : typeof value === 'number' ? formatNumber(value) : value
  return (
    <div className={`animate-rise rounded-lg border p-5 ${accent ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`} style={{ animationDelay: `${index * 60}ms` }}>
      <p className={`text-sm font-medium ${accent ? 'text-mint' : 'text-peri'}`}>{label}</p>
      <p className={`mt-1 text-4xl font-bold leading-tight tabular-nums ${accent ? 'text-white' : 'text-brand'}`}>{shown}</p>
      <span className={`mt-3 block h-[3px] w-10 rounded-full bg-mint`} />
      {hint && <p className={`mt-2 text-xs ${accent ? 'text-white/65' : 'text-muted'}`}>{hint}</p>}
    </div>
  )
}

/** Underlined tab strip, same language as the feed's category tabs. */
export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" role="tablist">
      {tabs.map((t) => {
        const on = t.id === value
        return (
          <button key={t.id} role="tab" aria-selected={on} onClick={() => onChange(t.id)}
            className={`relative shrink-0 cursor-pointer px-4 pb-3 pt-2 text-sm transition-colors after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:bg-mint after:transition-transform after:duration-300 ${
              on ? 'font-bold text-brand after:scale-x-100' : 'font-medium text-muted after:scale-x-0 hover:text-brand'}`}>
            {t.label}{t.count !== undefined && <span className="ms-1.5 text-xs text-peri tabular-nums">{formatNumber(t.count)}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Thin progress meter with a numeric label. Null renders a dash. */
export function Meter({ value, max = 100, suffix = '%' }: { value: number | null; max?: number; suffix?: string }) {
  if (value === null) return <span className="text-peri">—</span>
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <span className="inline-flex min-w-24 items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-mint" style={{ width: `${pct}%` }} /></span>
      <span className="text-xs font-semibold text-brand tabular-nums">{suffix === '%' ? `${value}%` : `${formatNumber(value)}/${formatNumber(max)}`}</span>
    </span>
  )
}

export function Th({ children, onClick, active, dir }: { children: ReactNode; onClick?: () => void; active?: boolean; dir?: 'asc' | 'desc' }) {
  return (
    <th scope="col" className="whitespace-nowrap px-3 py-3 text-start text-xs font-semibold text-muted first:ps-5 last:pe-5">
      {onClick ? (
        <button onClick={onClick} className={`inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-brand ${active ? 'text-brand' : ''}`}>
          {children}{dir === 'asc' ? <ChevronUp className={`size-3 ${active ? '' : 'opacity-0'}`} /> : <ChevronDown className={`size-3 ${active ? '' : 'opacity-0'}`} />}
        </button>
      ) : children}
    </th>
  )
}
