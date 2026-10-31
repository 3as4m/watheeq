import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Send, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Empty, ErrorNote, PageTitle, Spinner } from '../components/ui'
import { WhatsAppIcon, whatsappLink } from '../components/WhatsApp'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { RequestItem, RequestKind } from '../lib/types'
import { timeAgo } from '../lib/utils'

export const REQUEST_KIND: Record<RequestKind, string> = { community: 'طلب مجتمع', suggestion: 'اقتراح' }
export const REQUEST_STATUS: Record<RequestItem['status'], { label: string; tone: string }> = {
  new: { label: 'جديد', tone: 'bg-brand-soft text-brand' },
  reviewing: { label: 'قيد المراجعة', tone: 'bg-cloud text-muted' },
  done: { label: 'تم', tone: 'bg-mint-soft text-mint-deep' },
  declined: { label: 'لم يُعتمد', tone: 'bg-danger/10 text-danger' },
}

export default function Suggest() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const [f, setF] = useState({ kind: 'community' as RequestKind, title: '', body: '' })
  const [sent, setSent] = useState(false)

  const mine = useQuery({
    queryKey: ['requests', 'mine'],
    queryFn: async () => {
      const { data, error } = await supabase.from('requests').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false })
      if (error) throw error
      return data as RequestItem[]
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('requests').insert({ kind: f.kind, title: f.title.trim(), body: f.body.trim() })
      if (error) throw error
    },
    onSuccess: () => { setSent(true); setF({ ...f, title: '', body: '' }); qc.invalidateQueries({ queryKey: ['requests'] }) },
  })
  const submit = (e: FormEvent) => { e.preventDefault(); setSent(false); send.mutate() }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle kicker="صوتك يصنع المجتمع" title="اطلب مجتمعًا أو شاركنا اقتراحًا" />
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع الطلب">
            {([['community', Users, 'طلب مجتمع جديد', 'موضوع أو فئة تتمنى أن يكون لها مجتمع'], ['suggestion', Lightbulb, 'اقتراح', 'فكرة لتحسين المنصة أو المحتوى']] as const).map(([k, Icon, label, hint]) => (
              <button key={k} type="button" role="radio" aria-checked={f.kind === k} onClick={() => setF({ ...f, kind: k })}
                className={`cursor-pointer rounded-md border-2 p-3 text-start transition-colors ${f.kind === k ? 'border-brand bg-brand-soft/60' : 'border-line hover:border-brand/40'}`}>
                <Icon className={`size-5 ${f.kind === k ? 'text-brand' : 'text-peri'}`} />
                <span className="mt-2 block text-sm font-bold text-brand">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="rt">{f.kind === 'community' ? 'اسم أو موضوع المجتمع' : 'عنوان الاقتراح'}</label>
            <input id="rt" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required minLength={3} maxLength={120}
              placeholder={f.kind === 'community' ? 'مثال: مجتمع لأولياء أمور المراهقين' : 'مثال: تسجيل اللقاءات بجودة أعلى'} />
          </div>
          <div>
            <label className="label" htmlFor="rb">التفاصيل</label>
            <textarea id="rb" className="input min-h-32" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={3000}
              placeholder={f.kind === 'community' ? 'لمن هذا المجتمع؟ وما الذي تحتاجه منه؟' : 'اشرح فكرتك باختصار'} />
          </div>
          <ErrorNote error={send.error} />
          {sent && <p role="status" className="animate-rise border-s-4 border-mint bg-mint-soft px-3.5 py-2.5 text-sm font-medium text-mint-deep">وصلنا طلبك، شكرًا لك. ستجد حالته في القائمة أدناه.</p>}
          <button className="btn-primary" disabled={send.isPending}><Send className="size-4 -scale-x-100" />{send.isPending ? 'جار الإرسال...' : 'إرسال'}</button>
        </form>

        <aside className="card h-fit p-5">
          <p className="kicker">تفضل التواصل المباشر؟</p>
          <p className="mt-1 text-sm text-muted">راسلنا على واتساب وسنرد عليك في أقرب وقت.</p>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn mt-4 w-full bg-[#25D366] text-white hover:bg-[#1eb658]">
            <WhatsAppIcon className="size-5" />واتساب
          </a>
          <p className="mt-2 text-center text-xs text-peri tabular-nums" dir="ltr">+974 5020 6468</p>
        </aside>
      </div>

      <h2 className="mb-4 mt-10 border-s-[5px] border-mint ps-3 text-lg font-bold text-brand">طلباتي</h2>
      <ErrorNote error={mine.error} />
      {mine.isLoading ? <Spinner /> : !mine.data?.length ? <Empty title="لم ترسل أي طلب بعد" /> : (
        <ul className="card divide-y divide-line">
          {mine.data.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-peri">{REQUEST_KIND[r.kind]} · {timeAgo(r.created_at)}</p>
                <p className="font-bold text-brand">{r.title}</p>
                {r.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.body}</p>}
              </div>
              <span className={`tag ${REQUEST_STATUS[r.status].tone}`}>{REQUEST_STATUS[r.status].label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
