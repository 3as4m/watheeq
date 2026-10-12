import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CornerDownLeft, Pin, Send, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { Avatar, ErrorNote, LikeButton, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCommunity, useTo } from '../lib/community'
import { AUTHOR_FIELDS, fetchPost } from '../lib/queries'
import { supabase } from '../lib/supabase'
import type { Comment } from '../lib/types'
import { authorLevel, formatNumber, timeAgo } from '../lib/utils'

type CommentWithLike = Comment & { liked: boolean }

export default function PostPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { session } = useAuth()
  const { community, isStaff } = useCommunity()
  const to = useTo()
  const uid = session!.user.id
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)

  const post = useQuery({ queryKey: ['post', id], queryFn: () => fetchPost(id, uid, community.id) })

  const comments = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`*, author:profiles!comments_author_id_fkey(${AUTHOR_FIELDS})`)
        .eq('post_id', id)
        .eq('author.members.community_id', community.id)
        .order('created_at')
      if (error) throw error
      const list = data as unknown as Comment[]
      let liked = new Set<string>()
      if (list.length) {
        const r = await supabase.from('comment_likes').select('comment_id').eq('user_id', uid).in('comment_id', list.map((c) => c.id))
        liked = new Set((r.data ?? []).map((x) => x.comment_id as string))
      }
      return list.map((c) => ({ ...c, liked: liked.has(c.id) })) as CommentWithLike[]
    },
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['comments', id] })
    qc.invalidateQueries({ queryKey: ['post', id] })
    qc.invalidateQueries({ queryKey: ['posts'] })
  }

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('comments').insert({ post_id: id, body: text.trim(), parent_id: replyTo?.id ?? null })
      if (error) throw error
    },
    onSuccess: () => { setText(''); setReplyTo(null); refresh() },
  })

  const likeComment = useMutation({
    mutationFn: async ({ c, next }: { c: CommentWithLike; next: boolean }) => {
      const { error } = !next
        ? await supabase.from('comment_likes').delete().eq('comment_id', c.id).eq('user_id', uid)
        : await supabase.from('comment_likes').insert({ comment_id: c.id })
      if (error) throw error
    },
    onSettled: refresh,
  })

  const delComment = useMutation({
    mutationFn: async (cid: string) => { const { error } = await supabase.from('comments').delete().eq('id', cid); if (error) throw error },
    onSuccess: refresh,
  })

  const delPost = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('posts').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posts'] }); nav(to('/')) },
  })

  const pin = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('set_post_pinned', { pid: id, val: !post.data!.pinned }); if (error) throw error },
    onSuccess: refresh,
  })

  if (post.isLoading) return <Spinner />
  if (!post.data) return <p className="py-16 text-center text-muted">المنشور غير موجود.</p>

  const p = post.data
  const all = comments.data ?? []
  const roots = all.filter((c) => !c.parent_id)
  const repliesOf = (cid: string) => all.filter((c) => c.parent_id === cid)
  const canDelete = (authorId: string) => authorId === uid || isStaff

  const onSubmit = (e: FormEvent) => { e.preventDefault(); if (text.trim()) add.mutate() }

  const renderComment = (c: CommentWithLike, isReply = false) => (
    <div key={c.id} className={`animate-rise ${isReply ? 'mt-4' : 'border-t border-line pt-5 first:border-t-0 first:pt-0'}`}>
      <div className="flex gap-3">
        <Link to={to(`/u/${c.author.username}`)} className="shrink-0">
          <Avatar name={c.author.display_name} src={c.author.avatar_url} size={isReply ? 32 : 38} level={isReply ? undefined : authorLevel(c.author)} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 leading-snug">
            <Link to={to(`/u/${c.author.username}`)} className="text-sm font-bold text-brand hover:underline">{c.author.display_name}</Link>
            <span className="text-xs text-peri">{timeAgo(c.created_at)}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-7 text-ink/90">{c.body}</p>
          <div className="mt-1.5 flex items-center gap-4 text-xs text-muted">
            <LikeButton size="sm" liked={c.liked} count={c.like_count} onToggle={(next) => likeComment.mutate({ c, next })} />
            {!isReply && (
              <button className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-brand" onClick={() => { setReplyTo(c); document.getElementById('comment-box')?.focus() }}>
                <CornerDownLeft className="size-3.5" />رد
              </button>
            )}
            {canDelete(c.author_id) && (
              <button className="cursor-pointer transition-colors hover:text-danger" onClick={() => confirm('حذف هذا التعليق؟') && delComment.mutate(c.id)}>حذف</button>
            )}
          </div>
          {!isReply && repliesOf(c.id).length > 0 && (
            <div className="mt-1 border-s-2 border-mint/60 ps-4">{repliesOf(c.id).map((r) => renderComment(r, true))}</div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Link to={to('/')} className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand">
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />العودة للمجتمع
        </Link>
        <div className="flex gap-1">
          {isStaff && <button className="btn-quiet" onClick={() => pin.mutate()} disabled={pin.isPending}><Pin className="size-4" />{p.pinned ? 'إلغاء التثبيت' : 'تثبيت'}</button>}
          {canDelete(p.author_id) && (
            <button className="btn-danger" onClick={() => confirm('حذف هذا المنشور نهائيا؟') && delPost.mutate()}><Trash2 className="size-4" />حذف</button>
          )}
        </div>
      </div>

      <PostCard post={p} full />
      <ErrorNote error={pin.error ?? delPost.error ?? delComment.error ?? likeComment.error} />

      <section className="card p-5 sm:p-6" aria-label="التعليقات">
        <h2 className="mb-5 flex items-baseline gap-2 text-lg font-bold text-brand">
          التعليقات<span className="text-sm font-medium text-peri tabular-nums">{formatNumber(p.comment_count)}</span>
        </h2>
        {comments.isLoading ? <Spinner /> : roots.length === 0
          ? <p className="pb-2 text-sm text-muted">لا توجد تعليقات بعد. كن أول من يشارك رأيه.</p>
          : <div>{roots.map((c) => renderComment(c))}</div>}

        <form onSubmit={onSubmit} className="mt-6 border-t border-line pt-5">
          {replyTo && (
            <p className="mb-2 flex items-center justify-between border-s-4 border-mint bg-mint-soft px-3 py-1.5 text-sm text-brand">
              <span>الرد على <strong>{replyTo.author.display_name}</strong></span>
              <button type="button" className="cursor-pointer text-muted hover:text-brand" aria-label="إلغاء الرد" onClick={() => setReplyTo(null)}><X className="size-4" /></button>
            </p>
          )}
          <div className="flex items-end gap-2 rounded-md border border-line bg-white p-2 transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <textarea id="comment-box" rows={2} className="min-h-12 flex-1 resize-y bg-transparent px-2 py-1 text-[15px] leading-7 focus:outline-none" placeholder="اكتب تعليقك..."
              value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} aria-label="تعليق"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) add.mutate() }} />
            <button className="btn-primary btn-icon" disabled={add.isPending || !text.trim()} aria-label="إرسال"><Send className="size-4 -scale-x-100" /></button>
          </div>
          <div className="mt-2"><ErrorNote error={add.error} /></div>
        </form>
      </section>
    </div>
  )
}
