import type { AttendanceStatus, EventItem } from './types'

export type EventRow = EventItem & { event_rsvps: { user_id: string }[]; event_attendance: { user_id: string; status: AttendanceStatus }[] }

export const EVENT_SELECT = '*, event_rsvps(user_id), event_attendance(user_id, status)'

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = { present: 'حاضر', late: 'متأخر', absent: 'غائب', excused: 'بعذر' }
export const ATTENDANCE_TONE: Record<AttendanceStatus, string> = {
  present: 'bg-mint-soft text-mint-deep',
  late: 'bg-brand-soft text-brand',
  absent: 'bg-danger/10 text-danger',
  excused: 'bg-cloud text-muted',
}

const MIN = 60_000
export const eventEnd = (e: Pick<EventItem, 'starts_at' | 'ends_at'>) =>
  e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 120 * MIN

/** Self check-in window, mirrored from check_in() in the database. */
export const checkInOpen = (e: Pick<EventItem, 'starts_at' | 'ends_at'>, now = Date.now()) =>
  now >= new Date(e.starts_at).getTime() - 15 * MIN && now <= eventEnd(e) + 30 * MIN

export const isPast = (e: Pick<EventItem, 'starts_at' | 'ends_at'>, now = Date.now()) => eventEnd(e) < now

export const isAttended = (s?: AttendanceStatus) => s === 'present' || s === 'late'

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' })
