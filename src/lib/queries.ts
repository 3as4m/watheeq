import { supabase } from './supabase'
import type { Post } from './types'

export type PostWithLike = Post & { liked: boolean }

export const AUTHOR_FIELDS = 'id,username,display_name,avatar_url,members(points)'

export const POST_SELECT =
  `*, author:profiles!posts_author_id_fkey(${AUTHOR_FIELDS}), category:categories(id,name,color)`

export const PAGE_SIZE = 15

async function withLikes(posts: Post[], uid: string): Promise<PostWithLike[]> {
  if (!posts.length) return []
  const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', uid).in('post_id', posts.map((p) => p.id))
  const liked = new Set((data ?? []).map((r) => r.post_id as string))
  return posts.map((p) => ({ ...p, liked: liked.has(p.id) }))
}

export async function fetchPosts(opts: { uid: string; page: number; categoryId?: string | null; authorId?: string }) {
  let q = supabase.from('posts').select(POST_SELECT)
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId)
  if (opts.authorId) q = q.eq('author_id', opts.authorId)
  const from = opts.page * PAGE_SIZE
  const { data, error } = await q
    .order('pinned', { ascending: false })
    .order('last_activity_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  if (error) throw error
  return withLikes(data as unknown as Post[], opts.uid)
}

export async function fetchPost(id: string, uid: string) {
  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('id', id).single()
  if (error) throw error
  return (await withLikes([data as unknown as Post], uid))[0]
}

export async function togglePostLike(postId: string, uid: string, liked: boolean) {
  const { error } = liked
    ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid)
    : await supabase.from('post_likes').insert({ post_id: postId })
  if (error) throw error
}
