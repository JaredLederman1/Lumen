/**
 * lib/data.ts: Single source of truth for mock vs. real data.
 *
 * Flip USE_MOCK_DATA to false to route all fetches through the real API routes.
 * No other file in the codebase should import directly from lib/mockData or
 * reference Prisma models from a client component.
 */

import {
  mockAccounts,
  mockTransactions,
  mockNetWorth,
  mockMonthlyData,
  mockSpendingByCategory,
  mockNetWorthHistory,
  mockPortfolio,
} from '@/lib/mockData'

export const USE_MOCK_DATA = true

// ─── Re-exports (synchronous; used by client components directly) ────────────

export {
  mockAccounts,
  mockTransactions,
  mockNetWorth,
  mockMonthlyData,
  mockSpendingByCategory,
  mockNetWorthHistory,
  mockPortfolio,
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Account = (typeof mockAccounts)[number]
export type Transaction = (typeof mockTransactions)[number]
export type NetWorthSummary = typeof mockNetWorth
export type MonthlyData = (typeof mockMonthlyData)[number]
export type SpendingCategory = (typeof mockSpendingByCategory)[number]
export type NetWorthSnapshot = (typeof mockNetWorthHistory)[number]
export type PortfolioPosition = (typeof mockPortfolio)[number]

// ─── Async fetchers (used by components that fetch on mount) ──────────────────

export async function fetchAccounts(): Promise<Account[]> {
  if (USE_MOCK_DATA) return mockAccounts
  const res = await fetch('/api/accounts')
  const data = await res.json()
  return data.accounts ?? []
}

export async function fetchTransactions(params?: {
  accountId?: string
  category?: string
  page?: number
  limit?: number
}): Promise<{ transactions: Transaction[]; total: number }> {
  if (USE_MOCK_DATA) {
    const { accountId, category, page = 1, limit = 20 } = params ?? {}
    const filtered = mockTransactions.filter(tx => {
      if (accountId && tx.accountId !== accountId) return false
      if (category && tx.category !== category) return false
      return true
    })
    const start = (page - 1) * limit
    return { transactions: filtered.slice(start, start + limit), total: filtered.length }
  }
  const qs = new URLSearchParams()
  if (params?.accountId) qs.set('accountId', params.accountId)
  if (params?.category)  qs.set('category',  params.category)
  if (params?.page)      qs.set('page',       String(params.page))
  if (params?.limit)     qs.set('limit',      String(params.limit))
  const res = await fetch(`/api/transactions?${qs}`)
  const data = await res.json()
  return { transactions: data.transactions ?? [], total: data.total ?? 0 }
}

export async function fetchNetWorth(): Promise<NetWorthSummary> {
  if (USE_MOCK_DATA) return mockNetWorth
  const res = await fetch('/api/networth')
  const data = await res.json()
  return {
    current:           data.netWorth       ?? 0,
    lastMonth:         mockNetWorth.lastMonth, // API doesn't expose this yet
    totalAssets:       data.totalAssets    ?? 0,
    totalLiabilities:  data.totalLiabilities ?? 0,
  }
}
