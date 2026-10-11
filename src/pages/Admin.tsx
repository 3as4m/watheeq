import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useCategories } from '../components/Composer'
import { ErrorNote, PageTitle } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const { community, isAdmin } = useAuth()
  const qc = useQueryClient()
  const cats = useCategories()
  const [f, setF] = useState({ name: community?.name ?? '', tagline: community?.tagline ?? '', about: community?.about ?? '' })
  const [saved, setSaved] = useState(false)
  const [catName, setCatName] = useState('')

  const saveInfo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('communities').update({ name: f.name.trim(), tagline: f.tagline.trim() || null, about: f.about.trim() || null }).eq('id', community!.id)
      if (error) throw error
    },
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ['community'] }) },
  })

  const addCat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('categories').insert({ community_id: community!.id, name: catName.trim(), position: cats.data?.length ?? 0 })
      if (error) throw error
    },
    onSuccess: () => { setCatName(''); qc.invalidateQueries({ queryKey: ['categories'] }) },
  })

  const delCat = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('categories').delete().eq('id', id); if (error) throw error },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  if (!isAdmin) return <Navigate to="/" replace />

  const submit = (e: FormEvent) => { e.preventDefault(); setSaved(false); saveInfo.mutate() }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageTitle kicker="للمؤسس والمديرين" title="إعدادات المجتمع" />

      <form onSubmit={submit} className="card space-y-3 p-5 sm:p-6">
        <h2 className="font-bold text-brand">معلومات المجتمع</h2>
        <div><label className="label" htmlFor="an">الاسم</label><input id="an" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} /></div>
        <div><label className="label" htmlFor="at">الشعار النصي</label><input id="at" className="input" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} maxLength={120} /></div>
        <div><label className="label" htmlFor="aa">عن المجتمع</label><textarea id="aa" className="input min-h-28" value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} maxLength={2000} /></div>
        <ErrorNote error={saveInfo.error} />
        {saved && <p role="status" className="animate-rise text-sm font-medium text-mint-deep">تم الحفظ.</p>}
        <button className="btn-primary" disabled={saveInfo.isPending}>حفظ</button>
      </form>

      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="font-bold text-brand">تصنيفات المنشورات</h2>
        <ErrorNote error={addCat.error ?? delCat.error} />
        <ul className="divide-y divide-line">
          {cats.data?.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="h-4 w-[3px] rounded-full bg-mint" aria-hidden="true" />
              <span className="flex-1">{c.name}</span>
              <button className="btn-danger !p-2" aria-label={`حذف ${c.name}`} onClick={() => confirm('حذف التصنيف؟ تبقى المنشورات بدون تصنيف.') && delCat.mutate(c.id)}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (catName.trim()) addCat.mutate() }}>
          <input className="input" placeholder="تصنيف جديد" value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={40} aria-label="اسم التصنيف" />
          <button className="btn-primary btn-icon" disabled={addCat.isPending} aria-label="إضافة تصنيف"><Plus className="size-4" /></button>
        </form>
      </section>
    </div>
  )
}
