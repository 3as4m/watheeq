export type Role = 'owner' | 'admin' | 'moderator' | 'member'

export interface Community {
  id: string
  slug: string
  name: string
  tagline: string | null
  about: string | null
  logo_url: string | null
  cover_url: string | null
  is_private: boolean
  archived: boolean
  created_at: string
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

export type Membership = Member & { community: Community }

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
  community_id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  link_url: string | null
}

export type QuestionKind = 'single' | 'multiple' | 'text'
export interface QuizOption { id: string; text: string }

export interface QuizQuestion {
  id: string
  quiz_id: string
  kind: QuestionKind
  prompt: string
  options: QuizOption[]
  position: number
}

export interface Quiz {
  id: string
  community_id: string
  lesson_id: string | null
  title: string
  description: string | null
  pass_score: number
  points: number
  published: boolean
  quiz_questions: QuizQuestion[]
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  answers: Record<string, string[] | string>
  score: number
  correct_count: number
  graded_count: number
  passed: boolean
  created_at: string
}

export interface QuizResult {
  score: number
  passed: boolean
  correct_count: number
  graded_count: number
  points_awarded: number
  results: { question_id: string; correct: boolean | null; correct_options: string[]; explanation: string | null }[]
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'

export interface Attendance {
  event_id: string
  user_id: string
  status: AttendanceStatus
  method: 'self' | 'staff'
  note: string | null
  marked_at: string
}

/** One row of member_analytics(): everything known about a participant's engagement. */
export interface MemberStats {
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  email: string
  role: Role
  points: number
  level: number
  joined_at: string
  last_active_at: string | null
  posts: number
  comments: number
  lessons_completed: number
  lessons_total: number
  quiz_attempts: number
  quizzes_passed: number
  quiz_avg: number | null
  events_attended: number
  events_held: number
  attendance_rate: number | null
}

export interface CommunityOverview {
  id: string
  slug: string
  name: string
  tagline: string | null
  is_private: boolean
  archived: boolean
  created_at: string
  members: number
  active_30d: number
  posts_30d: number
  lessons_completed: number
  quiz_attempts: number
  quiz_avg: number | null
  events_held: number
  attendance_rate: number | null
}

export interface PlatformUser {
  id: string
  email: string
  display_name: string
  username: string
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
  is_platform_admin: boolean
  communities: { id: string; slug: string; name: string; role: Role }[]
}
