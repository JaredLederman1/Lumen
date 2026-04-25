/**
 * Per-domain recommended action copy for the per-signal detail page.
 *
 * Hardcoded for v1 to keep the page render path synchronous. A later
 * iteration may route through the Illumin's Engine surface, but for now the
 * static phrasing keeps the institutional voice consistent and avoids a
 * model call on every page load.
 */

import type { SignalDomain } from '@/lib/types/vigilance'

export interface RecommendedAction {
  headline: string
  body: string
  cta: { label: string; href: string } | null
}

const ACTIONS: Record<SignalDomain, RecommendedAction> = {
  idle_cash: {
    headline: 'Move idle cash into yield',
    body: 'Cash above your operating buffer is sitting idle. Move it into a high-yield savings account or short-duration treasuries to reclaim the spread.',
    cta: { label: 'Open accounts', href: '/dashboard/accounts' },
  },
  hysa: {
    headline: 'Close the rate gap',
    body: 'Your savings yield is below the prevailing market rate. Switch to a high-yield account or move cash to capture the difference.',
    cta: { label: 'Compare options', href: '/dashboard/accounts' },
  },
  debt: {
    headline: 'Reduce high-APR exposure',
    body: 'Carrying balances above 8% APR compounds against you. Prioritize paydown or refinance to lower the effective rate.',
    cta: { label: 'Plan paydown', href: '/dashboard/forecast' },
  },
  match: {
    headline: 'Capture the employer match',
    body: 'Unused 401(k) match is forfeited compensation. Increase your contribution rate to at least the match cap before year end.',
    cta: { label: 'Adjust contributions', href: '/dashboard/benefits' },
  },
  benefits: {
    headline: 'Use the benefit before it expires',
    body: 'This benefit has measurable annual value that goes unclaimed if not used. Enroll or schedule the action this open period.',
    cta: { label: 'Open benefits', href: '/dashboard/benefits' },
  },
  tax_advantaged: {
    headline: 'Fill remaining tax-advantaged room',
    body: 'Contribution limits do not roll forward. Fund the remaining IRA or HSA capacity for the current year before the filing deadline.',
    cta: { label: 'Open accounts', href: '/dashboard/accounts' },
  },
  subscription: {
    headline: 'Audit the subscription line',
    body: 'Recurring charges have drifted above the threshold you set. Review the merchant list and cancel anything no longer in use.',
    cta: { label: 'Review recurring', href: '/dashboard/transactions' },
  },
  category_overspend: {
    headline: 'Bring this category back in band',
    body: 'Spending in this category has crossed the budget line. Reduce the next two weeks of activity here, or rebalance the budget intentionally.',
    cta: { label: 'Open cash flow', href: '/dashboard/cashflow' },
  },
  recurring_change: {
    headline: 'Confirm the recurring change',
    body: 'A recurring charge has changed in a way that warrants review. Verify the new amount is intentional and reflects current value.',
    cta: { label: 'Review recurring', href: '/dashboard/transactions' },
  },
}

export function getRecommendedAction(domain: SignalDomain): RecommendedAction {
  return ACTIONS[domain]
}
