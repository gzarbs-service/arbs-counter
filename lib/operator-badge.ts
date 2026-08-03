// Shared badge style for operator names, used both in the accounts panel
// and on surebet cards so they always look identical everywhere in the app.
const OPERATOR_BADGE_CLASS = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'

export function operatorBadgeColor(_userId: string): string {
  return OPERATOR_BADGE_CLASS
}
