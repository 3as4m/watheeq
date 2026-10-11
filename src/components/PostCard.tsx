import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Pin } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { togglePostLike, type PostWithLike } from '../lib/queries'
import { authorLevel, formatNumber, timeAgo } from '../lib/utils'
import { Avatar, CategoryTag, LikeButton } from './ui'

export default function PostCard({ post, full = false, style }: { post: PostWithLike; full?: boolean; style?: CSSProperties }) {
  const { session } = useAuth()
  const qc = useQueryClient()
  const like = useMutation({
    mutationFn: (next: boolean) => togglePostLike(post.id, session!.user.id, !next),
    onSettled: () => { qc.invalidateQueries({ queryKey: ['posts'] }); qc.invalidateQueries({ queryKey: ['post', post.id] }) },
  })

  return (
    <article style={style}
      className={`card relative overflow-hidden p-5 sm:p-6 ${full ? '' : 'card-hover animate-rise'} ${post.pinned ? 'border-s-4 border-s-mint' : ''}`}>
      <header className="flex items-center gap-3">
        <Link to={`/u/${post.author.username}`} className="relative z-10">
          <Avatar name={post.author.display_name} src={post.author.avatar_url} size={42} level={authorLevel(post.author)} />
        </Link>
        <div className="min-w-0 flex-1 leading-snug">
          <Link to={`/u/${post.author.username}`} className="relative z-10 font-bold text-brand hover:underline">{post.author.display_name}</Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{timeAgo(post.created_at)}</span>
            {post.category && <><span className="text-line" aria-hidden="true">|</span><CategoryTag name={post.category.name} /></>}
          </p>
        </div>
        {post.pinned && <span className="tag bg-brand text-white"><Pin className="size-3" />مثبّت</span>}
      </header>

      <div className="mt-4">
        {full ? <h1 className="text-2xl font-bold leading-snug text-brand">{post.title}</h1> : (
          <h2 className="text-lg font-bold leading-snug text-brand">
            {/* Stretched link: the whole card opens the post; inner links sit above it. */}
            <Link to={`/post/${post.id}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand">
              {post.title}
            </Link>
          </h2>
        )}
        {post.body && (
          <p className={`mt-2 whitespace-pre-wrap break-words text-ink/85 ${full ? 'text-[16.5px] leading-8' : 'line-clamp-3 text-[15px]'}`}>{post.body}</p>
        )}
      </div>

      {post.media.length > 0 && (
        <div className={`relative z-10 mt-4 grid gap-2 ${post.media.length > 1 ? 'grid-cols-2' : ''}`}>
          {(full ? post.media : post.media.slice(0, 4)).map((m) => (
            <a key={m} href={m} target="_blank" rel="noreferrer" className="overflow-hidden rounded-md">
              <img src={m} alt="" loading="lazy" className="max-h-80 w-full border border-line object-cover" />
            </a>
          ))}
        </div>
      )}

      <footer className="relative z-10 mt-4 flex items-center gap-2 border-t border-line pt-3">
        <LikeButton liked={post.liked} count={post.like_count} onToggle={(next) => like.mutate(next)} />
        <Link to={`/post/${post.id}`} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:text-brand">
          <MessageCircle className="size-[18px]" /><span className="tabular-nums">{formatNumber(post.comment_count)}</span>
          <span className="sr-only">تعليق</span>
        </Link>
        {!full && post.comment_count > 0 && (
          <span className="ms-auto text-xs text-peri">آخر نشاط {timeAgo(post.last_activity_at)}</span>
        )}
      </footer>
    </article>
  )
}
