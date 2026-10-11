import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, PenLine, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Category } from '../lib/types'
import { uploadImage } from '../lib/upload'
import { Avatar, ErrorNote } from './ui'

export function useCategories() {
  const { community } = useAuth()
  return useQuery({
    queryKey: ['categories', community?.id],
    enabled: !!community,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('position')
      if (error) throw error
      return data as Category[]
    },
  })
}

export default function Composer() {
  const { community, profile, session } = useAuth()
  const qc = useQueryClient()
  const cats = useCategories()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [media, setMedia] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<unknown>(null)

  const reset = () => { setOpen(false); setTitle(''); setBody(''); setCategoryId(''); setMedia([]) }

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('posts').insert({
        community_id: community!.id, title: title.trim(), body: body.trim(), media, category_id: categoryId || null,
      })
      if (error) throw error
    },
    onSuccess: () => { reset(); qc.invalidateQueries({ queryKey: ['posts'] }) },
  })

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true); setUploadError(null)
    try {
      const urls = await Promise.all([...files].slice(0, 4 - media.length).map((f) => uploadImage('media', session!.user.id, f)))
      setMedia((m) => [...m, ...urls])
    } catch (e) { setUploadError(e) } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate() }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="card card-hover group flex w-full cursor-pointer items-center gap-3 p-3 ps-4 text-start">
        <Avatar name={profile?.display_name ?? ''} src={profile?.avatar_url} size={38} />
        <span className="flex-1 text-[15px] text-muted">شارك تجربة أو اطرح سؤالًا على المجتمع...</span>
        <span className="btn-primary pointer-events-none hidden group-hover:bg-brand-dark sm:inline-flex"><PenLine className="size-4" />منشور جديد</span>
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card animate-rise overflow-hidden">
      <div className="flex gap-3 p-5 pb-3">
        <Avatar name={profile?.display_name ?? ''} src={profile?.avatar_url} size={38} />
        <div className="min-w-0 flex-1">
          <input className="w-full bg-transparent text-lg font-bold text-brand placeholder:text-peri focus:outline-none" placeholder="عنوان المنشور"
            value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} autoFocus aria-label="عنوان المنشور" />
          <textarea className="mt-1 min-h-28 w-full resize-y bg-transparent text-[15px] leading-7 placeholder:text-muted/70 focus:outline-none"
            placeholder="اكتب ما تريد مشاركته..." value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} aria-label="نص المنشور" />
        </div>
      </div>

      {media.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {media.map((m) => (
            <div key={m} className="relative">
              <img src={m} alt="" className="size-20 rounded-md border border-line object-cover" />
              <button type="button" onClick={() => setMedia(media.filter((x) => x !== m))} aria-label="إزالة الصورة"
                className="absolute -end-1.5 -top-1.5 grid size-5 cursor-pointer place-items-center rounded-full bg-brand text-white"><X className="size-3" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 pb-3">
        <p className="mb-2 text-xs font-medium text-muted">التصنيف</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="التصنيف">
          {cats.data?.map((c) => {
            const on = categoryId === c.id
            return (
              <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setCategoryId(on ? '' : c.id)}
                className={`tag cursor-pointer border py-1.5 transition-colors ${on ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted hover:border-brand/40 hover:text-brand'}`}>
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2 px-5"><ErrorNote error={uploadError} /><ErrorNote error={create.error} /></div>

      <div className="mt-2 flex items-center gap-2 border-t border-line bg-cloud/60 px-4 py-3">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <button type="button" className="btn-quiet" disabled={uploading || media.length >= 4} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" />{uploading ? 'جار الرفع...' : 'صورة'}
        </button>
        <div className="ms-auto flex gap-2">
          <button type="button" className="btn-quiet" onClick={reset}>إلغاء</button>
          <button className="btn-primary" disabled={create.isPending || uploading || !title.trim()}>{create.isPending ? 'جار النشر...' : 'نشر'}</button>
        </div>
      </div>
    </form>
  )
}
