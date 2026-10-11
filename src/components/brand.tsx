import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { MARK_PATHS, MARK_VIEWBOX, PATTERN_GLYPHS, PATTERN_TILE, WORD_PATH, WORD_VIEWBOX } from '../brand/paths'

const NAVY = '#003692'
const MINT = '#70c997'
const CLOUD = '#f2f5f9'

type Tone = 'color' | 'white'

/** The hand-lettered وثيق mark. `white` is the reversed version used on navy (business card back, lanyard). */
export function Mark({ tone = 'color', className, title = 'وثيق' }: { tone?: Tone; className?: string; title?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} role="img" aria-label={title}>
      {MARK_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill={p.tone === 'mint' ? MINT : tone === 'white' ? '#fff' : NAVY} />
      ))}
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox={WORD_VIEWBOX} className={className} aria-hidden="true">
      <path d={WORD_PATH} fill={MINT} />
    </svg>
  )
}

/** Vertical lockup (الشعار الطولي): mark over WATHEEQ. */
export function LogoStacked({ tone = 'color', className }: { tone?: Tone; className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className ?? ''}`}>
      <Mark tone={tone} className="w-full" />
      <Wordmark className="mt-[9%] w-[58%]" />
    </div>
  )
}

/** Horizontal lockup (الشعار العرضي): mark, then مجتمع وثيق over WATHEEQ. Height drives everything. */
export function LogoHorizontal({ tone = 'color', className }: { tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.35em] ${className ?? ''}`} style={{ height: '1em' }}>
      <Mark tone={tone} className="h-full w-auto" title="" />
      <span className="flex flex-col justify-center gap-[0.06em]">
        <span className={`text-[0.42em] font-bold leading-none ${tone === 'white' ? 'text-white' : 'text-brand'}`}>مجتمع وثيق</span>
        <Wordmark className="h-[0.17em] w-auto self-start" />
      </span>
    </span>
  )
}

/** The mint fatha from the logo, used on its own as the brand's leaf accent. */
export function Leaf({ className, style, color = MINT }: { className?: string; style?: CSSProperties; color?: string }) {
  return (
    <svg viewBox="366 12 100 67" className={className} style={style} aria-hidden="true">
      <path d={MARK_PATHS[3].d} fill={color} />
    </svg>
  )
}

/** Hairline outline of the mark, drawn huge behind covers (PDF pages 1, 2, 13). `draw` lets CSS trace it in. */
export function OutlineMark({ className, color = NAVY, opacity = 0.35, draw = false }: { className?: string; color?: string; opacity?: number; draw?: boolean }) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={`pointer-events-none ${draw ? 'h-draw' : ''} ${className ?? ''}`} aria-hidden="true" overflow="visible">
      {MARK_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1} vectorEffect="non-scaling-stroke"
          pathLength={draw ? 1 : undefined} style={draw ? ({ '--i': i } as CSSProperties) : undefined} />
      ))}
    </svg>
  )
}

const patternSvg = (() => {
  const { w, h } = PATTERN_TILE
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${NAVY}"/><path fill="${CLOUD}" d="${PATTERN_GLYPHS}"/><path transform="translate(${w} 0)" fill="${CLOUD}" d="${PATTERN_GLYPHS}"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})()

/** The repeating وثيق glyph band (PDF page 7) that closes the business card, letterhead and ID card.
 *  `animated` lets it drift slowly sideways; the loop length tracks the rendered tile width. */
export function PatternBand({ className, framed = true, animated = false }: { className?: string; framed?: boolean; animated?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!animated || !el) return
    const ro = new ResizeObserver(() => el.style.setProperty('--tile-w', `${(el.offsetHeight * PATTERN_TILE.w) / PATTERN_TILE.h}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [animated])
  const band = (
    <div
      ref={ref}
      aria-hidden="true"
      className={`${framed ? 'h-full' : className ?? ''} ${animated ? 'animate-drift' : ''}`}
      style={{ backgroundImage: patternSvg, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x', backgroundPosition: '0 0' }}
    />
  )
  if (!framed) return band
  return <div aria-hidden="true" className={`border-y-2 border-brand bg-white py-[3px] ${className ?? ''}`}>{band}</div>
}

/** Fallback course cover in the style of the PDF's story posts (page 15): navy, white-in-frame, mint. */
export function CourseCover({ index }: { index: number }) {
  const v = index % 3
  const n = String(index + 1).padStart(2, '0')
  if (v === 0) {
    return (
      <div className="relative size-full overflow-hidden bg-brand">
        <OutlineMark className="absolute -bottom-[45%] -start-[10%] w-[95%]" color="#ffffff" opacity={0.16} />
        <Mark tone="white" className="absolute right-5 top-5 w-16" />
        <span className="absolute bottom-4 left-5 text-5xl font-bold text-mint tabular-nums" dir="ltr">{n}</span>
      </div>
    )
  }
  if (v === 1) {
    return (
      <div className="relative size-full overflow-hidden border-[6px] border-brand bg-white">
        <OutlineMark className="absolute -bottom-[40%] -end-[15%] w-[90%]" color="#297289" opacity={0.3} />
        <Leaf className="absolute left-[30%] top-[30%] w-[42%] rotate-[-8deg]" />
        <Mark className="absolute right-4 top-4 w-14" />
        <span className="absolute bottom-3 left-4 text-5xl font-bold text-brand tabular-nums" dir="ltr">{n}</span>
      </div>
    )
  }
  return (
    <div className="relative size-full overflow-hidden bg-mint">
      <OutlineMark className="absolute -top-[30%] -start-[20%] w-[100%]" color="#ffffff" opacity={0.35} />
      <Mark tone="white" className="absolute right-5 top-5 w-16" />
      <span className="absolute bottom-4 left-5 text-5xl font-bold text-white tabular-nums" dir="ltr">{n}</span>
    </div>
  )
}

/** Section chrome lifted from the PDF slide frame: running label, hairline, page number. */
export function SectionMeta({ label, n, tone = 'light' }: { label: string; n: string; tone?: 'light' | 'dark' }) {
  const c = tone === 'dark' ? 'text-white/55' : 'text-peri'
  return (
    <div className={`flex items-center gap-5 ${c}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className={`h-px flex-1 ${tone === 'dark' ? 'bg-white/20' : 'bg-fog/70'}`} />
      <span className="text-lg font-light tracking-[0.12em] tabular-nums" dir="ltr">{n}</span>
    </div>
  )
}

/** Heading with the mint vertical bar on its leading edge (PDF pages 6, 13, 14). */
export function AccentHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`border-s-[6px] border-mint ps-4 sm:ps-6 ${className ?? ''}`}>{children}</div>
}
