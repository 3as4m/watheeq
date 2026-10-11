import { Heart } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { MARK_PATHS, MARK_VIEWBOX } from '../brand/paths'
import { formatNumber, levelFor } from '../lib/utils'
import { Leaf } from './brand'

export function Avatar({ name, src, size = 40, level }: { name: string; src?: string | null; size?: number; level?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  const img = src
    ? <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" />
    : (
      <span style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand">
        {name.trim().charAt(0) || '؟'}
      </span>
    )
  if (!level) return img
  const b = Math.max(16, Math.round(size * 0.42))
  return (
    <span className="relative inline-flex shrink-0">
      {img}
      <span aria-label={`المستوى ${level}`} style={{ width: b, height: b, fontSize: b * 0.58 }}
        className="absolute -bottom-0.5 -end-1 grid place-items-center rounded-full bg-brand font-bold text-white ring-2 ring-white tabular-nums">
        {level}
      </span>
    </span>
  )
}

/** Brand loader: the logo outline drawing itself, with the mint leaf breathing. */
export function Spinner({ label = 'جار التحميل' }: { label?: string }) {
  return (
    <div className="flex justify-center py-16" role="status" aria-label={label}>
      <svg viewBox={MARK_VIEWBOX} className="w-20" aria-hidden="true">
        {MARK_PATHS.map((p, i) => (
          <path key={i} d={p.d} pathLength={1} fill="none" stroke={p.tone === 'mint' ? '#70c997' : '#003692'} strokeWidth={2.5}
            vectorEffect="non-scaling-stroke" strokeDasharray="1 1" className="animate-draw" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </svg>
    </div>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card relative overflow-hidden px-6 py-14 text-center">
      <Leaf className="mx-auto mb-4 w-12 animate-float" />
      <p className="text-lg font-bold text-brand">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Level shown as a navy number tile followed by its label. */
export function LevelBadge({ points, level, compact }: { points?: number; level?: number; compact?: boolean }) {
  const lv = level ?? levelFor(points ?? 0)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
      <span className="grid size-5 place-items-center rounded-[3px] bg-brand text-[11px] font-bold text-white tabular-nums">{lv}</span>
      {!compact && 'المستوى'}
    </span>
  )
}

/** Category tag: a short mint bar and the name. */
export function CategoryTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
      <span className="h-3 w-[3px] rounded-full bg-mint" aria-hidden="true" />{name}
    </span>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : (error as { message?: string }).message ?? 'حدث خطأ غير متوقع'
  return <p role="alert" className="border-s-4 border-danger bg-danger/8 px-3.5 py-2.5 text-sm text-danger">{msg}</p>
}

export function PageTitle({ title, kicker, children }: { title: string; kicker?: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div className="border-s-[5px] border-mint ps-3.5">
        {kicker && <p className="kicker mb-0.5">{kicker}</p>}
        <h1 className="text-2xl font-bold leading-tight text-brand sm:text-[2rem]">{title}</h1>
      </div>
      {children}
    </div>
  )
}

/**
 * Optimistic like toggle with a pop + burst. `onToggle` persists; on failure the
 * parent's refetch puts the real state back.
 */
export function LikeButton({ liked, count, onToggle, size = 'md' }: { liked: boolean; count: number; onToggle: (next: boolean) => void; size?: 'sm' | 'md' }) {
  const [state, setState] = useState({ liked, count })
  const [burst, setBurst] = useState(0)
  useEffect(() => setState({ liked, count }), [liked, count])

  const click = () => {
    const next = !state.liked
    setState((s) => ({ liked: next, count: s.count + (next ? 1 : -1) }))
    if (next) setBurst((b) => b + 1)
    onToggle(next)
  }
  const icon = size === 'sm' ? 'size-3.5' : 'size-[18px]'
  return (
    <button type="button" onClick={click} aria-pressed={state.liked} aria-label={state.liked ? 'إلغاء الإعجاب' : 'إعجاب'}
      className={`group/like relative inline-flex cursor-pointer items-center gap-1.5 rounded-md transition-colors ${size === 'sm' ? 'text-xs' : 'px-2 py-1.5 text-sm'} ${
        state.liked ? 'font-semibold text-brand' : 'text-muted hover:text-brand'}`}>
      <span className="relative grid place-items-center">
        {burst > 0 && <span key={burst} className="absolute inset-0 animate-burst rounded-full border-2 border-mint" aria-hidden="true" />}
        <Heart key={`h${burst}`} className={`${icon} ${state.liked ? 'fill-brand' : ''} ${state.liked && burst ? 'animate-pop' : ''}`} />
      </span>
      <span className="tabular-nums">{formatNumber(state.count)}</span>
    </button>
  )
}
