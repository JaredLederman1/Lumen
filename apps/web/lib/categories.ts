/**
 * Canonical category list for Illumin.
 *
 * Every transaction, budget line, cashflow chart, and filter dropdown
 * should use these exact strings. When Plaid (or any other source)
 * provides a raw category, run it through normalizeCategory() first.
 */

export const CATEGORIES = [
  'Income',
  'Housing and Utilities',
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Travel',
  'Education',
  'Personal Care',
  'Subscriptions',
  'Insurance',
  'Debt Payment',
  'Savings',
  'Transfer',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

/** Categories shown in filter/edit dropdowns (excludes meta-categories) */
export const FILTER_CATEGORIES = CATEGORIES.filter(c => c !== 'Transfer')

/** Categories appropriate for budget line items */
export const BUDGET_CATEGORIES = CATEGORIES.filter(
  c => c !== 'Income' && c !== 'Transfer'
)

/**
 * Map from Plaid raw category strings (lowercased) to canonical names.
 * Plaid sends personal_finance_category.primary values like
 * "FOOD_AND_DRINK" which become "FOOD AND DRINK" after underscore replacement.
 */
const PLAID_MAP: Record<string, Category> = {
  // Plaid personal_finance_category.primary values (lowercased, underscores replaced)
  'income':                     'Income',
  'transfer in':                'Income',
  'transfer out':               'Transfer',
  'food and drink':             'Dining',
  'groceries':                  'Groceries',
  'transportation':             'Transport',
  'travel':                     'Travel',
  'entertainment':              'Entertainment',
  'recreation':                 'Entertainment',
  'general merchandise':        'Shopping',
  'general services':           'Other',
  'personal care':              'Personal Care',
  'apparel and accessories':    'Shopping',
  'home improvement':           'Housing and Utilities',
  'rent and utilities':         'Housing and Utilities',
  'utilities':                  'Housing and Utilities',
  'housing':                    'Housing and Utilities',
  'medical':                    'Health',
  'healthcare':                 'Health',
  'government and non profit':  'Other',
  'bank fees':                  'Other',
  'community':                  'Other',
  'shops':                      'Shopping',
  'payment':                    'Transfer',
  'loan payments':              'Debt Payment',
  'education':                  'Education',
  'subscription':               'Subscriptions',
  'insurance':                  'Insurance',

  // Legacy Plaid category[0] values (also lowercased)
  'service':                    'Other',
  'tax':                        'Other',
}

/**
 * Normalize any category string to a canonical Illumin category.
 * Handles Plaid raw values, user-entered strings, and existing canonical values.
 */
export function normalizeCategory(raw: string | null | undefined): Category {
  if (!raw) return 'Other'

  const cleaned = raw.replace(/_/g, ' ').trim()

  // Already a canonical category (case-insensitive match)
  const exact = CATEGORIES.find(c => c.toLowerCase() === cleaned.toLowerCase())
  if (exact) return exact

  // Plaid mapping
  const mapped = PLAID_MAP[cleaned.toLowerCase()]
  if (mapped) return mapped

  // Partial match fallback
  const lower = cleaned.toLowerCase()
  if (lower.includes('grocery') || lower.includes('supermarket')) return 'Groceries'
  if (lower.includes('restaurant') || lower.includes('food')) return 'Dining'
  if (lower.includes('rent') || lower.includes('mortgage') || lower.includes('housing')) return 'Housing and Utilities'
  if (lower.includes('uber') || lower.includes('lyft') || lower.includes('gas') || lower.includes('parking')) return 'Transport'
  if (lower.includes('electric') || lower.includes('water') || lower.includes('internet') || lower.includes('phone')) return 'Housing and Utilities'
  if (lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('medical')) return 'Health'
  if (lower.includes('gym') || lower.includes('fitness')) return 'Health'
  if (lower.includes('subscription') || lower.includes('netflix') || lower.includes('spotify')) return 'Subscriptions'
  if (lower.includes('insurance')) return 'Insurance'
  if (lower.includes('tuition') || lower.includes('school')) return 'Education'
  if (lower.includes('airline') || lower.includes('hotel') || lower.includes('airbnb')) return 'Travel'
  if (lower.includes('loan') || lower.includes('debt')) return 'Debt Payment'

  return 'Other'
}

/**
 * Account-type-aware sets for classifying transfers.
 */
const SAVINGS_ACCOUNT_TYPES = new Set([
  'savings', 'money market', 'cd', 'brokerage', 'investment',
  '401k', 'ira', 'roth', 'roth 401k', '403b', '529',
  'pension', 'retirement', 'sep ira', 'simple ira', 'hsa',
])

const LIABILITY_ACCOUNT_TYPES = new Set([
  'credit', 'credit card', 'loan', 'mortgage', 'student',
  'auto', 'home equity',
])

/**
 * Categorize a transaction using its Plaid data, account type, and amount.
 *
 * This is smarter than normalizeCategory alone because it can distinguish
 * savings contributions and debt payments from generic transfers by looking
 * at the account type the transaction lives on and the Plaid detailed category.
 */
export function categorizeTransaction(opts: {
  rawCategory: string | null
  detailedCategory?: string | null
  accountType: string
  amount: number  // already negated (negative = spending/outflow from user's perspective)
  overrideCategory?: string | null
}): Category {
  const { rawCategory, detailedCategory, accountType, amount, overrideCategory } = opts

  // User override always wins
  if (overrideCategory) return normalizeCategory(overrideCategory)

  const base = normalizeCategory(rawCategory)
  const acctType = accountType.toLowerCase()
  const detailed = (detailedCategory ?? '').toLowerCase().replace(/_/g, ' ')

  // If the base category is Transfer, use account context to refine
  if (base === 'Transfer' || base === 'Other') {
    // Inflow to a savings/investment account = Savings contribution
    if (amount > 0 && SAVINGS_ACCOUNT_TYPES.has(acctType)) {
      return 'Savings'
    }

    // Inflow to a liability account (credit card payment received)
    if (amount > 0 && LIABILITY_ACCOUNT_TYPES.has(acctType)) {
      return 'Debt Payment'
    }

    // Outflow from checking that Plaid detailed-categorizes as a loan/credit payment
    if (amount < 0 && (
      detailed.includes('loan payment') ||
      detailed.includes('credit card payment') ||
      detailed.includes('mortgage payment')
    )) {
      return 'Debt Payment'
    }

    // Outflow from checking that Plaid detailed-categorizes as savings transfer
    if (amount < 0 && (
      detailed.includes('savings') ||
      detailed.includes('investment')
    )) {
      return 'Savings'
    }
  }

  // Plaid sometimes categorizes loan payments under LOAN_PAYMENTS which already maps correctly
  // But also check detailed category for additional debt signals
  if (base === 'Other' && (
    detailed.includes('loan payment') ||
    detailed.includes('credit card payment')
  )) {
    return 'Debt Payment'
  }

  return base
}
