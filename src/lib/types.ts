export type Role = 'owner' | 'admin' | 'moderator' | 'member'

export interface Community {
  id: string
  slug: string
  name: string
  tagline: string | null
  about: string | null
  logo_url: string | null
  cover_url: string | null
}

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  created_at: string
}

export type ProfileLite = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> & { members?: { points: number }[] }

export interface Member {
  community_id: string
  user_id: string
  role: Role
  points: number
  joined_at: string
}

export interface Category {
  id: string
  name: string
  color: string
  position: number
}

export interface Post {
  id: string
  community_id: string
  author_id: string
  category_id: string | null
  title: string
  body: string
  media: string[]
  pinned: boolean
  like_count: number
  comment_count: number
  created_at: string
  last_activity_at: string
  author: ProfileLite
  category: Pick<Category, 'id' | 'name' | 'color'> | null
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_id: string | null
  body: string
  like_count: number
  created_at: string
  author: ProfileLite
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  body: string
  video_url: string | null
  position: number
  published: boolean
}

export interface Module {
  id: string
  course_id: string
  title: string
  position: number
  lessons: Lesson[]
}

export interface Course {
  id: string
  community_id: string
  title: string
  description: string | null
  cover_url: string | null
  position: number
  published: boolean
  min_level: number
}

export interface EventItem {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  link_url: string | null
}
