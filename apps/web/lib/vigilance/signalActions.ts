/**
 * Per-domain guidance copy for the per-signal detail page.
 *
 * Each entry pairs the watch's finding with a plain-language explanation
 * (mechanism, default cost, horizon), a concrete action path the user can
 * walk, and a description of what closes the gap and when.
 *
 * Hardcoded for v1 to keep the page render path synchronous. A later
 * iteration may route through the Illumin's Engine surface, but for now the
 * static phrasing keeps the institutional voice consistent and avoids a
 * model call on every page load.
 */

import type { SignalDomain } from '@/lib/types/vigilance'

export interface SignalGuidance {
  explanation: string
  actionSteps: string[]
  afterActing: string
  cta: { label: string; href: string } | null
}

const GUIDANCE: Record<SignalDomain, SignalGuidance> = {
  idle_cash: {
    explanation:
      'Illumin scans liquid cash balances and flags any amount above a three-month operating buffer that sits in checking or low-yield accounts. The default cost is the spread between checking interest, near zero, and a high-yield savings account at roughly 4.5%. This gap accrues every day the cash stays put and compounds across the year.',
    actionSteps: [
      'Open a high-yield savings account at a major bank (Marcus, Ally, Capital One 360) or a brokerage cash management account (Fidelity, Schwab).',
      'Link the new account to the existing checking account as an external transfer destination.',
      'Move the flagged amount above the three-month buffer in a single ACH transfer.',
      'Set up an automatic monthly sweep so future excess cash moves on its own.',
      'Confirm the new APR appears on the account statement within one statement cycle.',
    ],
    afterActing:
      'The gap closes on the next perimeter scan once the cash registers in a yielding account. Most scans run within 24 hours of a balance change.',
    cta: { label: 'Open accounts', href: '/dashboard/accounts' },
  },
  hysa: {
    explanation:
      'Illumin tracks the APR on every savings and money market account against the prevailing top-of-market rate. A gap is flagged when the current rate sits below market by enough to make a meaningful annual delta on the balance. The default cost is the difference between the two rates applied to the held balance over twelve months.',
    actionSteps: [
      'Locate the current APR on the existing account\'s most recent statement or the bank\'s online dashboard.',
      'Compare against current top-of-market rates published by Bankrate, NerdWallet, or DepositAccounts.',
      'Open a higher-rate account at a competing bank if the delta exceeds 50 basis points.',
      'Transfer the savings balance to the new account in a single ACH move.',
      'Close the prior account or leave a token balance to keep options open.',
    ],
    afterActing:
      'The gap closes when the new account\'s APR registers on the next scan, usually within one statement cycle.',
    cta: { label: 'Compare options', href: '/dashboard/accounts' },
  },
  debt: {
    explanation:
      'Illumin compares the APR on every liability against an expected portfolio return of roughly 7%. Balances above 8% APR are flagged because every dollar in interest charged exceeds what the same dollar can earn invested. The default cost is the annual interest accrued on the high-APR balance.',
    actionSteps: [
      'Identify the highest-APR balance on the account list (typically a credit card or store card).',
      'Allocate cash above the three-month operating buffer toward that single balance.',
      'Set autopay to a fixed dollar amount above the minimum, sized to clear the balance within 12 to 24 months.',
      'Stop new charges on the card until the balance is paid in full.',
      'Once cleared, redirect the autopay amount toward the next-highest APR balance.',
    ],
    afterActing:
      'The gap narrows with every payment and closes when the balance reaches zero or the APR drops below the 8% threshold.',
    cta: { label: 'Plan paydown', href: '/dashboard/forecast' },
  },
  match: {
    explanation:
      'Illumin reads the 401(k) match formula from extracted benefits and compares the year-to-date contribution rate against the rate required to capture the full match. The default cost is the unclaimed employer contribution, which is forfeited once the calendar year closes. This gap is annual and resets every January.',
    actionSteps: [
      'Confirm the match formula on the benefits portal or the most recent pay stub (typically a percentage match up to a percentage of salary).',
      'Calculate the contribution percentage required to receive the full match across the remaining pay periods in the year.',
      'Update the contribution rate in the 401(k) provider\'s portal (Fidelity NetBenefits, Empower, Vanguard, or Principal) or through HR if the rate is locked.',
      'Verify the new percentage on the next pay stub.',
      'Set a calendar reminder for December to confirm the annual cap was reached.',
    ],
    afterActing:
      'The gap closes the moment the next paycheck reflects the new contribution rate. The watch updates within one pay cycle of the contribution posting.',
    cta: { label: 'Adjust contributions', href: '/dashboard/benefits' },
  },
  benefits: {
    explanation:
      'Illumin cross-checks extracted benefits against transaction activity to find unclaimed value across HSA, FSA, ESPP, commuter, tuition, and wellness lines. The default cost is the annual dollar value of the benefit if left unclaimed past the enrollment or use deadline. Most benefits forfeit unused capacity at year end.',
    actionSteps: [
      'Locate the specific benefit on the employer benefits portal during the open enrollment window.',
      'Enroll in the benefit and set a contribution amount or claim schedule.',
      'For payroll-deducted benefits, confirm the deduction appears on the next pay stub.',
      'For reimbursable benefits, save documentation and submit claims through the benefits portal before the deadline.',
      'Check the captured value against the maximum monthly or annual cap each quarter.',
    ],
    afterActing:
      'The gap closes when the watch detects the first contribution or claim against the benefit. Reimbursable benefits resolve as claims clear; payroll benefits resolve on the next contribution.',
    cta: { label: 'Open benefits', href: '/dashboard/benefits' },
  },
  tax_advantaged: {
    explanation:
      'Illumin tracks year-to-date contributions to IRA and HSA accounts against current IRS limits. The default cost is the unused contribution capacity, which does not roll forward and is permanently lost after the April 15 filing deadline. The annual value reflects remaining capacity for the calendar year.',
    actionSteps: [
      'Identify which account types still have remaining capacity (Roth IRA, Traditional IRA, HSA).',
      'Open the account at a major brokerage if one does not already exist (Fidelity, Vanguard, Charles Schwab).',
      'Schedule an automatic monthly contribution sized to fill the remaining capacity by April 15 of the following year.',
      'Choose a target-date fund or a low-cost index fund as the default investment for new contributions.',
      'Confirm the first contribution clears within the statement cycle.',
    ],
    afterActing:
      'The gap narrows with each contribution and closes when the year-to-date total reaches the IRS limit. The watch updates on the next scan after the contribution posts.',
    cta: { label: 'Open accounts', href: '/dashboard/accounts' },
  },
  subscription: {
    explanation:
      'Illumin detects new recurring chains against the prior 90 days of merchant history. A subscription is flagged when a recurring chain begins inside the last 60 days with no prior trace of the merchant. The default cost is the annualized monthly charge, which continues at the current cadence until the user intervenes.',
    actionSteps: [
      'Locate the subscription on the merchant\'s site, in the merchant\'s mobile app, or in the email confirming the original sign-up.',
      'Decide whether the subscription\'s monthly value justifies the charge.',
      'Cancel the subscription through the merchant\'s account settings if it is no longer wanted.',
      'Save the cancellation confirmation email or screenshot for reference.',
      'Verify no further charges appear from the merchant on the next billing cycle.',
    ],
    afterActing:
      'The gap closes when the next billing cycle passes with no charge from the merchant. If the subscription is kept, dismissing the signal acknowledges the charge as intentional.',
    cta: { label: 'Review recurring', href: '/dashboard/transactions' },
  },
  category_overspend: {
    explanation:
      'Illumin compares each category\'s current-month spend against the budgeted amount, or the prior three-month average when no budget is set. A category is flagged when overspend exceeds the larger of a fixed dollar floor and a percentage of the basis. The default cost is the projected annual impact if the overspend continues at the current pace.',
    actionSteps: [
      'Open the transactions page filtered to the flagged category for the current month.',
      'Identify the specific charges driving the overspend, often a few large or unfamiliar transactions.',
      'Decide whether the spend was intentional, a one-off event, or a pattern worth correcting.',
      'Adjust spending in the category for the remainder of the month, or update the budget to reflect the new baseline.',
      'Set an alert threshold on the budget so a similar overrun surfaces earlier next month.',
    ],
    afterActing:
      'The gap resolves naturally as the month closes and a new month\'s spend resets the comparison. If the budget is intentionally raised, the gap closes on the next scan once the new budget registers.',
    cta: { label: 'Open cash flow', href: '/dashboard/cashflow' },
  },
  recurring_change: {
    explanation:
      'Illumin tracks every recurring charge for amount changes and disappearances. An increase is flagged when the latest charge is more than 15% above the prior three-charge median; a disappearance is flagged when a previously recurring merchant has been silent for 45 days. The default cost is the annualized impact of the change.',
    actionSteps: [
      'Open the merchant\'s account dashboard or recent billing email to confirm the new amount or status.',
      'For an increase, evaluate whether the new price reflects added value or a routine annual price hike.',
      'For a disappearance, verify the cancellation was intentional, or check the merchant for a failed payment notice.',
      'Cancel, downgrade, or contact the merchant directly if the new price is unacceptable.',
      'Confirm the next billing cycle reflects the chosen state.',
    ],
    afterActing:
      'The gap closes on the next billing cycle that reflects the resolved state, whether that is a confirmed cancellation, a restored charge, or an accepted new amount.',
    cta: { label: 'Review recurring', href: '/dashboard/transactions' },
  },
}

export function getSignalGuidance(domain: SignalDomain): SignalGuidance {
  return GUIDANCE[domain]
}
