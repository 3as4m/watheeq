import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Lock, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { CourseCover } from '../components/brand'
import { Empty, ErrorNote, PageTitle, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Community, Role } from '../lib/types'

const roleLabel: Record<Role, string> = { owner: 'مؤسس', admin: 'مدير', moderator: 'مشرف', member: 'عضو' }

function CommunityCard({ c, index, badge, action }: { c: Community; index: number; badge?: string; action?: React.ReactNode }) {
  return (
    <div className="card card-hover relative flex animate-rise flex-col overflow-hidden" style={{ animationDelay: `${Math.min(index, 9) * 55}ms` }}>
      <div className="relative aspect-[16/7] overflow-hidden">
        {c.cover_url ? <img src={c.cover_url} alt="" className="size-full object-cover" /> : <CourseCover index={index} />}
        {c.is_private && <span className="tag absolute start-3 top-3 bg-white text-brand"><Lock className="size-3" />خاص</span>}
        {c.archived && <span className="tag absolute end-3 top-3 bg-danger text-white">مؤرشف</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        {badge && <p className="text-xs font-semibold text-peri">{badge}</p>}
        <h2 className="text-lg font-bold leading-snug text-brand">{c.name}</h2>
        {c.tagline && <p className="line-clamp-2 text-sm text-muted">{c.tagline}</p>}
        <div className="mt-auto pt-3">{action}</div>
      </div>
    </div>
  )
}

export default function Hub() {
  const { memberships, isPlatformAdmin, refresh } = useAuth()
  const nav = useNavigate()
  const mineIds = new Set(memberships.map((m) => m.community_id))

  // RLS returns public communities, the ones you belong to, and (for platform admins) everything.
  const all = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('communities').select('*').order('created_at')
      if (error) throw error
      return data as Community[]
    },
  })

  const join = useMutation({
    mutationFn: async (c: Community) => {
      const { error } = await supabase.rpc('join_community', { cid: c.id })
      if (error) throw error
      return c.slug
    },
    onSuccess: async (slug) => { await refresh(); nav(`/c/${slug}`) },
  })

  const others = (all.data ?? []).filter((c) => !mineIds.has(c.id) && (isPlatformAdmin || !c.archived))

  return (
    <div className="space-y-12">
      <section>
        <PageTitle kicker="منصة وثيق" title="مجتمعاتك">
          {isPlatformAdmin && <Link to="/admin" className="btn-primary"><Plus className="size-4" />مجتمع جديد</Link>}
        </PageTitle>
        {memberships.length === 0 ? (
          <Empty title="لم تنضم إلى أي مجتمع بعد" hint="اختر مجتمعًا من القائمة أدناه، أو افتح رابط الدعوة الذي وصلك." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m, i) => (
              <CommunityCard key={m.community_id} c={m.community} index={i} badge={roleLabel[m.role]}
                action={<Link to={`/c/${m.community.slug}`} className="btn-primary w-full">دخول<ArrowLeft className="size-4" /></Link>} />
            ))}
          </div>
        )}
      </section>

      {(all.isLoading || others.length > 0) && (
        <section>
          <h2 className="mb-5 border-s-[5px] border-mint ps-3 text-xl font-bold text-brand">{isPlatformAdmin ? 'كل مجتمعات المنصة' : 'مجتمعات يمكنك الانضمام إليها'}</h2>
          <ErrorNote error={all.error ?? join.error} />
          {all.isLoading ? <Spinner /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((c, i) => (
                <CommunityCard key={c.id} c={c} index={i + memberships.length}
                  action={isPlatformAdmin
                    ? <Link to={`/c/${c.slug}`} className="btn-ghost w-full">فتح كمدير<ArrowLeft className="size-4" /></Link>
                    : <button className="btn-ghost w-full" disabled={join.isPending} onClick={() => join.mutate(c)}>انضمام</button>} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
