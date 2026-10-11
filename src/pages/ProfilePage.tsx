import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, MapPin, Pencil } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { Mark, OutlineMark, PatternBand } from '../components/brand'
import { Avatar, Empty, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { fetchPosts, PAGE_SIZE } from '../lib/queries'
import { supabase } from '../lib/supabase'
import type { Member, Profile } from '../lib/types'
import { uploadImage } from '../lib/upload'
import { formatNumber, levelFor } from '../lib/utils'

const roleLabel = { owner: 'مؤسس المجتمع', admin: 'مدير المجتمع', moderator: 'مشرف تربوي', member: 'عضو' } as const

export default function ProfilePage() {
  const { username = '' } = useParams()
  const { session, refresh } = useAuth()
  const uid = session!.user.id
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ display_name: '', bio: '', location: '' })

  const data = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data: p, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle()
      if (error) throw error
      if (!p) return null
      const { data: m } = await supabase.from('members').select('*').eq('user_id', p.id).maybeSingle()
      return { profile: p as Profile, member: (m ?? null) as Member | null }
    },
  })

  const authorId = data.data?.profile.id
  const posts = useInfiniteQuery({
    queryKey: ['posts', 'author', authorId],
    enabled: !!authorId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPosts({ uid, page: pageParam, authorId }),
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length : undefined),
  })

  const save = useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, 'display_name' | 'bio' | 'location' | 'avatar_url'>>) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', uid)
      if (error) throw error
    },
    onSuccess: () => { setEditing(false); qc.invalidateQueries({ queryKey: ['profile', username] }); qc.invalidateQueries({ queryKey: ['posts'] }); refresh() },
  })

  const changeAvatar = useMutation({
    mutationFn: async (file: File) => { const url = await uploadImage('avatars', uid, file); await save.mutateAsync({ avatar_url: url }) },
  })

  if (data.isLoading) return <Spinner />
  if (!data.data) return <p className="py-16 text-center text-muted">العضو غير موجود.</p>
  const { profile: p, member } = data.data
  const mine = p.id === uid
  const items = posts.data?.pages.flat() ?? []

  const startEdit = () => { setForm({ display_name: p.display_name, bio: p.bio ?? '', location: p.location ?? '' }); setEditing(true) }
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate({ display_name: form.display_name.trim(), bio: form.bio.trim() || null, location: form.location.trim() || null }) }

  const joined = member ? new Date(member.joined_at).toLocaleDateString('ar-u-nu-latn', { month: 'long', year: 'numeric' }) : null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card overflow-hidden">
        <div className="relative h-32 overflow-hidden bg-brand sm:h-40">
          <OutlineMark className="absolute -bottom-1/2 -start-[5%] w-[60%]" color="#ffffff" opacity={0.14} />
          <Mark tone="white" className="absolute end-6 top-6 w-20 sm:w-24" />
        </div>
        <PatternBand className="h-7" />
        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <div className="relative rounded-full bg-white p-1.5">
              <Avatar name={p.display_name} src={p.avatar_url} size={96} />
              {mine && (
                <>
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && changeAvatar.mutate(e.target.files[0])} />
                  <button onClick={() => fileRef.current?.click()} aria-label="تغيير الصورة" disabled={changeAvatar.isPending}
                    className="absolute bottom-1 end-1 grid size-8 cursor-pointer place-items-center rounded-full bg-brand text-white ring-2 ring-white"><Camera className="size-4" /></button>
                </>
              )}
            </div>
            {mine && !editing && <button className="btn-ghost" onClick={startEdit}><Pencil className="size-4" />تعديل الملف</button>}
          </div>

          {editing ? (
            <form onSubmit={submit} className="mt-5 animate-rise space-y-3">
              <div><label className="label" htmlFor="pn">الاسم</label><input id="pn" className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required maxLength={60} /></div>
              <div><label className="label" htmlFor="pb">نبذة</label><textarea id="pb" className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} /></div>
              <div><label className="label" htmlFor="pl">المدينة / البلد</label><input id="pl" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={80} /></div>
              <div className="flex gap-2"><button className="btn-primary" disabled={save.isPending}>حفظ</button><button type="button" className="btn-quiet" onClick={() => setEditing(false)}>إلغاء</button></div>
            </form>
          ) : (
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-brand">{p.display_name}</h1>
              <p className="mt-0.5 inline-block border-b border-mint pb-0.5 text-sm text-mint-deep">{member && member.role !== 'member' ? roleLabel[member.role] : 'عضو في مجتمع وثيق'}</p>
              {p.bio && <p className="mt-4 max-w-xl whitespace-pre-wrap text-[15px] leading-7 text-ink/85">{p.bio}</p>}
              {p.location && <p className="mt-3 flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-4" />{p.location}</p>}
            </div>
          )}
          <div className="mt-3"><ErrorNote error={save.error ?? changeAvatar.error} /></div>
        </div>

        {member && (
          <dl className="grid grid-cols-3 divide-x divide-x-reverse divide-line border-t border-line text-center">
            <div className="px-3 py-4"><dt className="text-xs text-muted">المستوى</dt><dd className="mt-1 text-2xl font-bold text-brand tabular-nums">{levelFor(member.points)}</dd></div>
            <div className="px-3 py-4"><dt className="text-xs text-muted">النقاط</dt><dd className="mt-1 text-2xl font-bold text-brand tabular-nums">{formatNumber(member.points)}</dd></div>
            <div className="px-3 py-4"><dt className="text-xs text-muted">عضو منذ</dt><dd className="mt-1.5 text-sm font-bold text-brand">{joined}</dd></div>
          </dl>
        )}
      </section>

      <h2 className="border-s-[5px] border-mint ps-3 text-lg font-bold text-brand">المنشورات</h2>
      {posts.isLoading ? <Spinner /> : items.length === 0 ? <Empty title="لا منشورات بعد" /> : items.map((it, i) => <PostCard key={it.id} post={it} style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }} />)}
      {posts.hasNextPage && <button className="btn-ghost w-full" onClick={() => posts.fetchNextPage()} disabled={posts.isFetchingNextPage}>عرض المزيد</button>}
    </div>
  )
}
