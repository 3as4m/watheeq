import type { CSSProperties } from 'react'
import { MARK_PATHS, MARK_VIEWBOX } from '../brand/paths'
import { Wordmark } from './brand'

/** Full-screen opening: the mark traces itself, fills, the leaf settles, then the curtain lifts. */
export default function Intro({ out, onSkip }: { out: boolean; onSkip: () => void }) {
  return (
    <div className={`intro ${out ? 'is-out' : ''}`} onClick={onSkip} role="presentation" aria-hidden="true">
      <div className="flex w-[min(62vw,300px)] flex-col items-center">
        <svg viewBox={MARK_VIEWBOX} className="intro-mark w-full overflow-visible">
          {MARK_PATHS.map((p, i) => {
            const c = p.tone === 'mint' ? '#70c997' : '#003692'
            return (
              <path key={i} d={p.d} pathLength={1} fill={c} stroke={c} strokeWidth={1.5} vectorEffect="non-scaling-stroke"
                className={i === 3 ? 'is-leaf' : undefined} style={{ '--i': i } as CSSProperties} />
            )
          })}
        </svg>
        <div className="intro-word mt-[9%] w-[58%]"><Wordmark className="w-full" /></div>
        <div className="mt-8 h-px w-40 overflow-hidden bg-line">
          <div className="intro-line h-full w-full origin-right bg-mint" />
        </div>
      </div>
    </div>
  )
}
