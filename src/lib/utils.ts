export const LEVEL_STARTS = [0, 5, 20, 65, 155, 515, 2015, 8015, 33015]

export function levelFor(points: number) {
  let lvl = 1
  LEVEL_STARTS.forEach((s, i) => { if (points >= s) lvl = i + 1 })
  return lvl
}

/** Level of an embedded author (profiles -> members(points)), or undefined if not loaded. */
export function authorLevel(a: { members?: { points: number }[] }) {
  return a.members?.length ? levelFor(a.members[0].points) : undefined
}

export function nextLevelAt(points: number) {
  const lvl = levelFor(points)
  return lvl >= 9 ? null : LEVEL_STARTS[lvl]
}

const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return 'الآن'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return new Date(iso).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ar-u-nu-latn', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  })
}

export function formatNumber(n: number) {
  return n.toLocaleString('ar-u-nu-latn')
}

// Turns a YouTube / Vimeo link into an embeddable URL; returns null for anything else.
export function embedUrl(url: string | null) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`
    if (host === 'youtube.com') {
      const id = u.searchParams.get('v') ?? u.pathname.split('/').pop()
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'vimeo.com') return `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean)[0]}`
    return null
  } catch {
    return null
  }
}

export function isHttpUrl(url: string) {
  try {
    const p = new URL(url).protocol
    return p === 'https:' || p === 'http:'
  } catch {
    return false
  }
}

export function fileExt(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : 'jpg'
}
