/**
 * Canonical category list for Illumin.
 *
 * Every transaction, budget line, cashflow chart, and filter dropdown
 * should use these exact strings. When Plaid (or any other source)
 * provides a raw category, run it through normalizeCategory() first.
 */

export const CATEGORIES = [
  'Income',
  'Housing',
  'Utilities',
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Childcare',
  'Travel',
  'Education',
  'Personal Care',
  'Donations',
  'Subscriptions',
  'Insurance',
  'Taxes',
  'Debt Payment',
  'Savings',
  'Fees',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

/** Categories shown in filter/edit dropdowns. "Transfer" has been retired
 *  from the canonical list; transfers between a user's own accounts are not
 *  spending and are now reclassified by the account-type refinement layer. */
export const FILTER_CATEGORIES: readonly Category[] = CATEGORIES

/** Categories appropriate for budget line items (exclude Income, which is
 *  inflow, not a budgeted outflow line). */
export const BUDGET_CATEGORIES = CATEGORIES.filter(c => c !== 'Income')

/**
 * Map from Plaid raw category strings (lowercased) to canonical names.
 * Plaid sends personal_finance_category.primary values like
 * "FOOD_AND_DRINK" which become "FOOD AND DRINK" after underscore replacement.
 */
const PLAID_MAP: Record<string, Category> = {
  // Plaid personal_finance_category.primary values (lowercased, underscores replaced)
  'income':                     'Income',
  'transfer in':                'Income',
  // transfer out has no inherent spending signal; account-type refinement in
  // categorizeTransaction will reclassify to Savings / Debt Payment when the
  // account on the other side gives a clear signal.
  'transfer out':               'Other',
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
  'home improvement':           'Housing',
  // Plaid's broad "rent and utilities" bucket is ambiguous; default to
  // Housing (the broader semantic) when no detailed signal narrows it.
  'rent and utilities':         'Housing',
  'utilities':                  'Utilities',
  'housing':                    'Housing',
  'medical':                    'Health',
  'healthcare':                 'Health',
  'government and non profit':  'Other',
  'bank fees':                  'Fees',
  'fees':                       'Fees',
  'community':                  'Other',
  'shops':                      'Shopping',
  // Plaid's legacy "payment" primary is nearly always a credit-card payment
  // or loan payment. Account-type refinement can still upgrade this.
  'payment':                    'Debt Payment',
  'loan payments':              'Debt Payment',
  'education':                  'Education',
  'subscription':               'Subscriptions',
  'insurance':                  'Insurance',

  // Legacy Plaid category[0] values (also lowercased)
  'service':                    'Other',
  'tax':                        'Taxes',
}

/**
 * Overlay dictionary for Plaid's `personal_finance_category.detailed` values.
 * Plaid's detailed strings carry signal that the primary bucket discards
 * (e.g. GENERAL_SERVICES_INSURANCE vs the vague GENERAL SERVICES primary).
 * Keys are stored in Plaid's native format: UPPERCASE with underscores, no spaces.
 * Matching is exact and case-insensitive (upcased at lookup time); no substring
 * matching happens in this layer. Only include entries whose signal is
 * unambiguous — do not add *_OTHER_GENERAL_SERVICES or OTHER_OTHER here, since
 * those should fall through to the merchant-name substring fallback.
 */
const PLAID_DETAILED_MAP: Record<string, Category> = {
  // General services — detailed buckets that map to specific canonical categories
  GENERAL_SERVICES_INSURANCE:                                    'Insurance',
  GENERAL_SERVICES_AUTOMOTIVE:                                   'Transport',
  GENERAL_SERVICES_EDUCATION:                                    'Education',
  GENERAL_SERVICES_TRAVEL:                                       'Travel',
  GENERAL_SERVICES_MEDICAL_AND_HEALTHCARE:                       'Health',
  GENERAL_SERVICES_UTILITIES:                                    'Utilities',
  GENERAL_SERVICES_CHILDCARE:                                    'Childcare',
  // Explicit Other (documented rather than fallen through) — Plaid's storage
  // bucket has no clear canonical mapping in our list.
  GENERAL_SERVICES_STORAGE:                                      'Other',

  // Government / non-profit
  GOVERNMENT_AND_NON_PROFIT_DONATIONS:                           'Donations',
  GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT:                         'Taxes',
  GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES: 'Other',

  // Bank fees — every Plaid detailed bucket in this primary is a fee.
  BANK_FEES_ATM_FEES:                                            'Fees',
  BANK_FEES_FOREIGN_TRANSACTION_FEES:                            'Fees',
  BANK_FEES_INSUFFICIENT_FUNDS:                                  'Fees',
  BANK_FEES_INTEREST_CHARGE:                                     'Fees',
  BANK_FEES_OTHER_BANK_FEES:                                     'Fees',
  BANK_FEES_OVERDRAFT_FEES:                                      'Fees',
}

/**
 * Normalize any category string to a canonical Illumin category.
 * Handles Plaid raw values, user-entered strings, and existing canonical values.
 */
export function normalizeCategory(
  raw: string | null | undefined,
  detailed?: string | null | undefined,
): Category {
  // (a) Exact canonical match on the primary/raw string (case-insensitive)
  if (raw) {
    const cleaned = raw.replace(/_/g, ' ').trim()
    const exact = CATEGORIES.find(c => c.toLowerCase() === cleaned.toLowerCase())
    if (exact) return exact
  }

  // (b) Plaid detailed-category overlay: exact match only, case-insensitive,
  //     against the unmodified Plaid detailed string (UPPERCASE_WITH_UNDERSCORES).
  if (detailed) {
    const detailedKey = detailed.trim().toUpperCase()
    if (detailedKey) {
      const detailedHit = PLAID_DETAILED_MAP[detailedKey]
      if (detailedHit) return detailedHit
    }
  }

  if (!raw) return 'Other'

  const cleaned = raw.replace(/_/g, ' ').trim()
  const lower = cleaned.toLowerCase()

  // (c) Plaid primary-category mapping
  const mapped = PLAID_MAP[lower]
  if (mapped) return mapped

  // (d) Partial match fallback
  if (lower.includes('grocery') || lower.includes('supermarket')) return 'Groceries'
  if (lower.includes('restaurant') || lower.includes('food')) return 'Dining'
  if (lower.includes('rent') || lower.includes('mortgage') || lower.includes('housing')) return 'Housing'
  if (lower.includes('uber') || lower.includes('lyft') || lower.includes('gas') || lower.includes('parking')) return 'Transport'
  if (lower.includes('electric') || lower.includes('water') || lower.includes('internet') || lower.includes('phone')) return 'Utilities'
  if (lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('medical')) return 'Health'
  if (lower.includes('gym') || lower.includes('fitness')) return 'Health'
  if (
    lower.includes('subscription') || lower.includes('netflix') || lower.includes('spotify') ||
    lower.includes('claude.ai') || lower.includes('godaddy') || lower.includes('openai') ||
    lower.includes('anthropic') || lower.includes('cursor') || lower.includes('vercel') ||
    lower.includes('supabase') || lower.includes('notion') || lower.includes('linear') ||
    lower.includes('github') || lower.includes('netlify')
  ) return 'Subscriptions'
  if (lower.includes('insurance')) return 'Insurance'
  if (lower.includes('tuition') || lower.includes('school')) return 'Education'
  if (lower.includes('airline') || lower.includes('hotel') || lower.includes('airbnb')) return 'Travel'
  if (lower.includes('loan') || lower.includes('debt')) return 'Debt Payment'

  // (e) Fall back
  return 'Other'
}

/**
 * Detects "masked" merchant names, the Plaid OTHER_OTHER artifacts where the
 * network identifier is a string of asterisks or a redacted stub (e.g.
 * "*-****** 35255", "**********************"). These rows carry no useful
 * signal for categorization and are the surface for inline correction on
 * the transactions page. Name pattern alone is the signal; no Plaid
 * detailed-category check happens here.
 */
export function isMaskedMerchant(merchantName: string | null | undefined): boolean {
  if (!merchantName) return true
  const trimmed = merchantName.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('*-')) return true
  if (/^\*+$/.test(trimmed)) return true
  if (/^\*+[\s\-]*\d*$/.test(trimmed)) return true
  if (/^\*{3,}/.test(trimmed)) return true
  return false
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
  // Optional, logging-only. When the final category resolves to "Other", these
  // are emitted in a structured console log so we can diagnose misclassifications.
  userId?: string | null
  merchantName?: string | null
  plaidLegacyCategory?: string | null
}): Category {
  const { rawCategory, detailedCategory, accountType, amount, overrideCategory, userId, merchantName, plaidLegacyCategory } = opts

  // User override always wins
  if (overrideCategory) return normalizeCategory(overrideCategory)

  const base = normalizeCategory(rawCategory, detailedCategory)
  const acctType = accountType.toLowerCase()
  const detailed = (detailedCategory ?? '').toLowerCase().replace(/_/g, ' ')

  let result: Category = base

  // If the base category is Other (the only ambiguous base remaining after
  // Transfer was retired from the canonical list), use account context to
  // refine. The refinement itself is unchanged.
  if (base === 'Other') {
    // Inflow to a savings/investment account = Savings contribution
    if (amount > 0 && SAVINGS_ACCOUNT_TYPES.has(acctType)) {
      result = 'Savings'
    }
    // Inflow to a liability account (credit card payment received)
    else if (amount > 0 && LIABILITY_ACCOUNT_TYPES.has(acctType)) {
      result = 'Debt Payment'
    }
    // Outflow from checking that Plaid detailed-categorizes as a loan/credit payment
    else if (amount < 0 && (
      detailed.includes('loan payment') ||
      detailed.includes('credit card payment') ||
      detailed.includes('mortgage payment')
    )) {
      result = 'Debt Payment'
    }
    // Outflow from checking that Plaid detailed-categorizes as savings transfer
    else if (amount < 0 && (
      detailed.includes('savings') ||
      detailed.includes('investment')
    )) {
      result = 'Savings'
    }
  }

  // Plaid sometimes categorizes loan payments under LOAN_PAYMENTS which already maps correctly
  // But also check detailed category for additional debt signals
  if (result === 'Other' && (
    detailed.includes('loan payment') ||
    detailed.includes('credit card payment')
  )) {
    result = 'Debt Payment'
  }

  if (result === 'Other') {
    // Determine which normalizeCategory branch produced 'Other' so we can
    // tell which layer is failing. Mirrors the logic in normalizeCategory
    // without altering it.
    let resolvedVia: 'no_plaid_data' | 'explicit_other' | 'substring_miss'
    if (!rawCategory) {
      resolvedVia = 'no_plaid_data'
    } else {
      const cleaned = rawCategory.replace(/_/g, ' ').trim()
      const lower = cleaned.toLowerCase()
      const exactIsOther = CATEGORIES.some(c => c.toLowerCase() === lower) && lower === 'other'
      const primaryMappedIsOther = PLAID_MAP[lower] === 'Other'
      const detailedKey = detailedCategory ? detailedCategory.trim().toUpperCase() : ''
      const detailedMappedIsOther = detailedKey ? PLAID_DETAILED_MAP[detailedKey] === 'Other' : false
      resolvedVia = (exactIsOther || primaryMappedIsOther || detailedMappedIsOther)
        ? 'explicit_other'
        : 'substring_miss'
    }
    const payload: Record<string, unknown> = {
      userId: userId ?? null,
      merchantName: merchantName ?? null,
      amount,
      accountType,
      plaidPrimary: rawCategory ?? null,
      plaidDetailed: detailedCategory ?? null,
      resolvedVia,
    }
    if (plaidLegacyCategory !== undefined) {
      payload.plaidLegacyCategory = plaidLegacyCategory
    }
    console.log('[categorization:other]', payload)
  }

  return result
}
