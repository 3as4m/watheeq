import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { OutlineMark, PatternBand } from '../components/brand'
import { Avatar, Empty, ErrorNote, LevelBadge, PageTitle, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Member, ProfileLite, Role } from '../lib/types'
import { formatNumber } from '../lib/utils'

const roleLabel: Record<Role, string> = { owner: 'مؤسس المجتمع', admin: 'مدير المجتمع', moderator: 'مشرف تربوي', member: 'عضو' }

type Row = Member & { profile: ProfileLite }

export default function Members() {
  const { session, isAdmin } = useAuth()
  const qc = useQueryClient()
  const [q, setQ] = useState('')

  const list = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*, profile:profiles!members_user_id_fkey(id,username,display_name,avatar_url)')
        .order('points', { ascending: false })
      if (error) throw error
      return data as unknown as Row[]
    },
  })

  const setRole = useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: Role }) => {
      const { error } = await supabase.from('members').update({ role }).eq('user_id', uid)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })

  const rows = (list.data ?? []).filter((r) => r.profile.display_name.includes(q.trim()) || r.profile.username.includes(q.trim().toLowerCase()))

  return (
    <div>
      <PageTitle kicker="أسر تشاركك الطريق" title="الأعضاء">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-peri" />
          <input className="input ps-9" placeholder="ابحث عن عضو..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" />
        </div>
      </PageTitle>
      {list.data && <p className="-mt-4 mb-6 text-sm text-muted">{formatNumber(list.data.length)} عضو في مجتمع وثيق</p>}
      <ErrorNote error={list.error ?? setRole.error} />
      {list.isLoading ? <Spinner /> : rows.length === 0 ? <Empty title="لا نتائج" hint="جرّب اسمًا آخر." /> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r, i) => (
            <li key={r.user_id} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              className="card card-hover relative flex animate-rise flex-col overflow-hidden text-center">
              <OutlineMark className="absolute -end-8 -top-6 w-[85%]" color="#297289" opacity={0.18} />
              <Link to={`/u/${r.profile.username}`} className="relative flex flex-1 flex-col items-center px-4 pb-4 pt-7">
                <span className="relative grid size-24 place-items-center">
                  <span className="absolute inset-0.5 rotate-45 rounded-[0_50%_50%_50%] bg-brand" />
                  <span className="relative"><Avatar name={r.profile.display_name} src={r.profile.avatar_url} size={70} /></span>
                </span>
                <span className="mt-4 line-clamp-1 font-bold text-brand">{r.profile.display_name}</span>
                <span className="mt-0.5 border-b border-mint pb-0.5 text-xs text-mint-deep">{r.role === 'member' ? 'عضو في مجتمع وثيق' : roleLabel[r.role]}</span>
                <span className="mt-3"><LevelBadge points={r.points} /></span>
              </Link>
              {isAdmin && r.role !== 'owner' && r.user_id !== session!.user.id && (
                <div className="relative border-t border-line px-3 py-2">
                  <select className="w-full cursor-pointer bg-transparent text-center text-xs font-medium text-muted focus:outline-none" value={r.role} aria-label={`دور ${r.profile.display_name}`}
                    onChange={(e) => setRole.mutate({ uid: r.user_id, role: e.target.value as Role })}>
                    <option value="member">عضو</option><option value="moderator">مشرف</option><option value="admin">مدير</option>
                  </select>
                </div>
              )}
              <PatternBand className="relative h-5" framed={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
