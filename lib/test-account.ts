import { Account, SurebetWithLegs } from './types'

// A surebet is considered a test surebet if any of its legs was placed on an
// account flagged as is_test. Legs only reference accounts by bookmaker +
// account_number (no foreign key), matching how AccountSelect resolves the
// account a leg belongs to.
export function isTestSurebet(surebet: SurebetWithLegs, accounts: Account[]): boolean {
  const legs = surebet.legs || []
  if (legs.length === 0 || accounts.length === 0) return false
  return legs.some((leg) =>
    accounts.some(
      (acc) => acc.is_test && acc.bookmaker === leg.bookmaker && acc.account_number === leg.account
    )
  )
}

export const TEST_ACCOUNT_BADGE_CLASS = 'bg-yellow-600/25 text-yellow-300 border border-yellow-600/50'
