// Shared color-per-operator badge used both in the accounts panel and on
// surebet cards, so the same worker always gets the same badge color
// everywhere in the app. Deterministic hash of the user id -> palette index,
// no need to store a color per profile in the database.

const OPERATOR_BADGE_COLORS = [
  'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  'bg-lime-500/20 text-lime-300 border border-lime-500/30',
  'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  'bg-pink-500/20 text-pink-300 border border-pink-500/30',
  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
]

export function operatorBadgeColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return OPERATOR_BADGE_COLORS[hash % OPERATOR_BADGE_COLORS.length]
}
