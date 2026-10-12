import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mark, OutlineMark, PatternBand } from '../components/brand'
import Composer, { useCategories } from '../components/Composer'
import PostCard from '../components/PostCard'
import { Empty, ErrorNote, LevelBadge, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCommunity, useTo } from '../lib/community'
import { fetchPosts, PAGE_SIZE } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { formatNumber, levelFor, nextLevelAt, LEVEL_STARTS } from '../lib/utils'

export default function Feed() {
  const { session } = useAuth()
  const { community, member } = useCommunity()
  const to = useTo()
  const uid = session!.user.id
  const cats = useCategories()
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const posts = useInfiniteQuery({
    queryKey: ['posts', community.id, 'feed', categoryId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPosts({ uid, communityId: community.id, page: pageParam, categoryId }),
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length : undefined),
  })
  const items = posts.data?.pages.flat() ?? []

  const nextEvent = useQuery({
    queryKey: ['events', community.id, 'next'],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('id,title,starts_at').eq('community_id', community.id).gte('starts_at', new Date().toISOString()).order('starts_at').limit(1).maybeSingle()
      return data as { id: string; title: string; starts_at: string } | null
    },
  })

  const tabs = [{ id: null as string | null, name: 'الكل' }, ...(cats.data ?? []).map((c) => ({ id: c.id as string | null, name: c.name }))]
  const pts = member?.points ?? 0
  const lvl = levelFor(pts)
  const next = nextLevelAt(pts)
  const pct = next ? Math.round(((pts - LEVEL_STARTS[lvl - 1]) / (next - LEVEL_STARTS[lvl - 1])) * 100) : 100

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <Composer />
        <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="التصنيفات">
          {tabs.map((t) => {
            const on = categoryId === t.id
            return (
              <button key={t.id ?? 'all'} role="tab" aria-selected={on} onClick={() => setCategoryId(t.id)}
                className={`relative shrink-0 cursor-pointer px-3.5 pb-3 pt-2 text-sm transition-colors after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:origin-center after:bg-mint after:transition-transform after:duration-300 ${
                  on ? 'font-bold text-brand after:scale-x-100' : 'font-medium text-muted after:scale-x-0 hover:text-brand'}`}>
                {t.name}
              </button>
            )
          })}
        </div>

        <ErrorNote error={posts.error} />
        {posts.isLoading ? <Spinner /> : items.length === 0 ? (
          <Empty title="لا توجد منشورات بعد" hint="كن أول من يبدأ النقاش في المجتمع." />
        ) : (
          items.map((p, i) => <PostCard key={p.id} post={p} style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }} />)
        )}
        {posts.hasNextPage && (
          <button className="btn-ghost w-full" disabled={posts.isFetchingNextPage} onClick={() => posts.fetchNextPage()}>
            {posts.isFetchingNextPage ? 'جار التحميل...' : 'عرض المزيد'}
          </button>
        )}
      </div>

      <aside className="hidden space-y-4 lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="overflow-hidden rounded-lg bg-brand text-white">
            <div className="relative px-6 pb-6 pt-7">
              <OutlineMark className="absolute -end-16 -top-10 w-[120%]" color="#ffffff" opacity={0.12} />
              <Mark tone="white" className="relative w-24" />
              <h2 className="relative mt-5 text-xl font-bold">{community?.name}</h2>
              <p className="relative mt-1 text-sm font-medium text-mint">{community?.tagline}</p>
              {community?.about && <p className="relative mt-3 text-sm leading-relaxed text-white/75">{community.about}</p>}
              <Link to="/welcome" className="relative mt-4 inline-flex items-center gap-1 text-xs font-medium text-white/60 transition-colors hover:text-white">
                عن المجتمع<ArrowLeft className="size-3" />
              </Link>
            </div>
            <PatternBand className="h-10" animated />
          </div>

          <Link to={to('/leaderboard')} className="card card-hover block p-5">
            <div className="flex items-center justify-between">
              <p className="kicker">مستواك</p>
              <LevelBadge level={lvl} />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-mint transition-[width] duration-700 ease-out-expo" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {next ? `${formatNumber(next - pts)} نقطة للمستوى ${lvl + 1}` : 'وصلت إلى أعلى مستوى'}
            </p>
          </Link>

          {nextEvent.data && (
            <Link to={to(`/calendar/${nextEvent.data.id}`)} className="card card-hover flex items-center gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-mint-soft text-mint-deep"><CalendarDays className="size-5" /></span>
              <span className="min-w-0">
                <span className="kicker block">اللقاء القادم</span>
                <span className="block truncate font-bold text-brand">{nextEvent.data.title}</span>
                <span className="block text-xs text-muted">
                  {new Date(nextEvent.data.starts_at).toLocaleDateString('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </span>
            </Link>
          )}
        </div>
      </aside>
    </div>
  )
}
