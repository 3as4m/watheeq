import { useQuery } from '@tanstack/react-query'
import { Check, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { OutlineMark } from '../components/brand'
import { Avatar, Empty, ErrorNote, LevelBadge, PageTitle, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { formatNumber, LEVEL_STARTS, levelFor, nextLevelAt } from '../lib/utils'

interface Row { user_id: string; username: string; display_name: string; avatar_url: string | null; points: number; level: number }

const periods = [
  { key: 7, label: 'هذا الأسبوع' },
  { key: 30, label: 'هذا الشهر' },
  { key: 0, label: 'كل الأوقات' },
]

// Podium order on screen (RTL): 1st in the middle, 2nd on the right, 3rd on the left.
const podium = [
  { rank: 2, h: 'h-28', cls: 'bg-white border border-line text-brand', num: 'text-brand' },
  { rank: 1, h: 'h-40', cls: 'bg-brand text-white', num: 'text-mint' },
  { rank: 3, h: 'h-20', cls: 'bg-mint text-brand', num: 'text-white' },
]

export default function Leaderboard() {
  const { community, member, session } = useAuth()
  const [days, setDays] = useState(7)

  const board = useQuery({
    queryKey: ['leaderboard', community?.id, days],
    enabled: !!community,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('leaderboard', { cid: community!.id, days: days || null })
      if (error) throw error
      return data as Row[]
    },
  })

  const pts = member?.points ?? 0
  const lvl = levelFor(pts)
  const next = nextLevelAt(pts)
  const pct = next ? Math.round(((pts - LEVEL_STARTS[lvl - 1]) / (next - LEVEL_STARTS[lvl - 1])) * 100) : 100
  const rows = (board.data ?? []).filter((r) => r.points > 0 || days === 0)
  const top = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <PageTitle kicker="كل إعجاب يصل إلى مشاركتك نقطة" title="لوحة الصدارة">
          <div className="inline-flex rounded-md border border-line bg-white p-1" role="tablist" aria-label="الفترة">
            {periods.map((p) => (
              <button key={p.key} role="tab" aria-selected={days === p.key} onClick={() => setDays(p.key)}
                className={`cursor-pointer rounded-[5px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${days === p.key ? 'bg-brand text-white' : 'text-muted hover:text-brand'}`}>{p.label}</button>
            ))}
          </div>
        </PageTitle>

        <ErrorNote error={board.error} />
        {board.isLoading ? <Spinner /> : rows.length === 0 ? <Empty title="لا نقاط في هذه الفترة بعد" hint="شارك في النقاشات وكن أول المتصدرين." /> : (
          <>
            <div key={days} className="mb-6 grid grid-cols-3 items-end gap-3 sm:gap-4">
              {podium.map(({ rank, h, cls, num }, i) => {
                const r = top[rank - 1]
                if (!r) return <div key={rank} />
                return (
                  <Link key={rank} to={`/u/${r.username}`} className="group flex animate-rise flex-col items-center text-center" style={{ animationDelay: `${[150, 0, 300][i]}ms` }}>
                    <Avatar name={r.display_name} src={r.avatar_url} size={rank === 1 ? 68 : 54} level={r.level} />
                    <span className="mt-2 line-clamp-1 text-sm font-bold text-brand group-hover:underline">{r.display_name}</span>
                    <span className="text-xs text-muted tabular-nums">{formatNumber(r.points)} نقطة</span>
                    <span className={`relative mt-3 flex w-full items-start justify-center overflow-hidden rounded-t-md pt-3 ${h} ${cls}`}>
                      {rank === 1 && <OutlineMark className="absolute -bottom-6 w-[140%]" color="#ffffff" opacity={0.14} />}
                      <span className={`relative text-4xl font-bold tabular-nums ${num}`}>{rank}</span>
                    </span>
                  </Link>
                )
              })}
            </div>

            {rest.length > 0 && (
              <ol className="card divide-y divide-line overflow-hidden">
                {rest.map((r, i) => {
                  const me = r.user_id === session?.user.id
                  return (
                    <li key={r.user_id} style={{ animationDelay: `${(i + 3) * 40}ms` }} className={`flex animate-rise items-center gap-3 px-4 py-3 ${me ? 'bg-mint-soft/60' : ''}`}>
                      <span className="w-7 text-center text-lg font-bold text-peri tabular-nums">{i + 4}</span>
                      <Link to={`/u/${r.username}`}><Avatar name={r.display_name} src={r.avatar_url} size={40} level={r.level} /></Link>
                      <Link to={`/u/${r.username}`} className="min-w-0 flex-1 truncate font-bold text-brand hover:underline">{r.display_name}{me && <span className="ms-2 text-xs font-medium text-mint-deep">(أنت)</span>}</Link>
                      <span className="text-sm font-bold text-brand tabular-nums">{formatNumber(r.points)}<span className="ms-1 text-xs font-medium text-muted">نقطة</span></span>
                    </li>
                  )
                })}
              </ol>
            )}
          </>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="relative overflow-hidden rounded-lg bg-brand p-6 text-white">
          <OutlineMark className="absolute -end-10 -top-8 w-[90%]" color="#ffffff" opacity={0.12} />
          <p className="relative text-sm font-medium text-mint">مستواك الحالي</p>
          <div className="relative mt-1 flex items-end gap-3">
            <span className="text-6xl font-bold leading-none tabular-nums">{lvl}</span>
            <span className="pb-1 text-sm text-white/70">{formatNumber(pts)} نقطة</span>
          </div>
          <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-mint transition-[width] duration-1000 ease-out-expo" style={{ width: `${pct}%` }} />
          </div>
          <p className="relative mt-2 text-xs text-white/70">{next ? `${formatNumber(next - pts)} نقطة للوصول إلى المستوى ${lvl + 1}` : 'وصلت إلى أعلى مستوى'}</p>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-bold text-brand">سلّم المستويات</h2>
          <ul className="space-y-1">
            {LEVEL_STARTS.map((s, i) => {
              const reached = pts >= s
              const current = lvl === i + 1
              return (
                <li key={s} className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm ${current ? 'bg-brand-soft font-bold text-brand' : reached ? 'text-brand' : 'text-muted'}`}>
                  <LevelBadge level={i + 1} compact />
                  <span className="flex-1">المستوى {i + 1}</span>
                  <span className="text-xs tabular-nums">{formatNumber(s)}</span>
                  {reached ? <Check className="size-3.5 text-mint-deep" /> : <Lock className="size-3.5 text-line" />}
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </div>
  )
}
