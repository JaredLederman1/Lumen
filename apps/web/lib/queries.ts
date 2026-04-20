'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STALE_TIMES } from '@/lib/queryClient'
import { normalizeCategory } from '@/lib/categories'
import type { ScoreReport } from '@illumin/types'
import type { BenefitStatus, ExtractedBenefits } from '@/lib/benefitsAnalysis'

// ── Auth token hook ──────────────────────────────────────────────────────────
// Subscribes to Supabase auth state and exposes the current bearer token.
// Used both as a query enabler (skip queries when token is null) and to
// build the Authorization header for fetch calls.

export function useAuthToken(): string | null {
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setToken(data.session?.access_token ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!cancelled) setToken(session?.access_token ?? null)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])
  return token
}

export function useAuthEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setEmail(data.session?.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!cancelled) setEmail(session?.user?.email ?? null)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])
  return email
}

function authHeaders(token: string | null, contentType?: string): Record<string, string> {
  const h: Record<string, string> = {}
  if (token) h.Authorization = `Bearer ${token}`
  if (contentType) h['Content-Type'] = contentType
  return h
}

async function getJson<T>(url: string, token: string | null): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json() as Promise<T>
}

// ── Query keys (single source of truth) ──────────────────────────────────────
// Grouped so invalidation can target a whole namespace
// (e.g. queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })).

export const queryKeys = {
  accounts: () => ['accounts'] as const,
  transactions: () => ['transactions'] as const,
  networth: () => ['networth'] as const,
  networthHistory: () => ['networth', 'history'] as const,
  cashflow: () => ['cashflow'] as const,
  cashflowTrends: () => ['cashflow', 'trends'] as const,
  forecast: () => ['forecast'] as const,
  goals: () => ['goals'] as const,
  budget: () => ['budget'] as const,
  budgetActuals: () => ['budget', 'actuals'] as const,
  portfolio: () => ['portfolio'] as const,
  portfolioHistory: (period?: string) => ['portfolio', 'history', period ?? 'default'] as const,
  recurring: () => ['recurring'] as const,
  recurringExclusions: () => ['recurring', 'exclusions'] as const,
  opportunity: () => ['opportunity'] as const,
  score: () => ['user', 'score'] as const,
  onboarding: () => ['user', 'onboarding'] as const,
  benefits: () => ['user', 'benefits'] as const,
  checklist: () => ['checklist'] as const,
  dashboardState: () => ['dashboard', 'state'] as const,
  plaidLinkToken: () => ['plaid', 'linkToken'] as const,
  merchants: () => ['merchants'] as const,
  profile: () => ['profile'] as const,
}

// ── Shared types (mirror dashboardData.tsx public surface) ───────────────────

export interface NetWorthApiResponse {
  netWorth: number
  previousNetWorth?: number
  totalAssets: number
  totalLiabilities: number
}

export interface NetWorthData {
  current: number
  lastMonth: number
  totalAssets: number
  totalLiabilities: number
}

export interface RawTransaction {
  id: string
  accountId: string
  merchantName: string | null
  amount: number
  category: string | null
  date: string | Date
  pending: boolean
}

export interface Account {
  id: string
  institutionName: string
  accountType: string
  classification?: string
  balance: number
  last4: string | null
}

export interface MonthlyData {
  month: string
  year?: number
  income: number
  expenses: number
  savings: number
}

export interface SpendingCategory {
  category: string
  amount: number
  color: string
}

export interface ForecastData {
  avgIncome: number
  avgExpenses: number
  avgSavings: number
  checkingBalance: number
  emergencyFundMonths: number
  historicalMonths: { month: string; balance: number; projected: boolean }[]
  projectedMonths: { month: string; balance: number; projected: boolean }[]
}

export interface OnboardingProfile {
  age: number
  annualIncome: number
  savingsRate: number
  retirementAge: number
}

export interface BenefitsData {
  extracted: ExtractedBenefits | null
  crossCheck: BenefitStatus[]
  actionItemsDone: string[]
}

export interface NetWorthHistory {
  history: { date: string; netWorth: number }[]
  hasHistory: boolean
  change30d: number
  changeAllTime: number
  hasAssetAccount: boolean
  hasLiabilityAccount: boolean
}

// ── Read queries ─────────────────────────────────────────────────────────────

type QueryOpts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>

export function useNetWorthQuery(opts?: QueryOpts<NetWorthData | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.networth(),
    queryFn: async (): Promise<NetWorthData | null> => {
      const data = await getJson<NetWorthApiResponse>('/api/networth', token)
      if (data?.netWorth === undefined) return null
      return {
        current: data.netWorth,
        lastMonth: data.previousNetWorth ?? data.netWorth,
        totalAssets: data.totalAssets,
        totalLiabilities: data.totalLiabilities,
      }
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useTransactionsQuery(opts?: QueryOpts<RawTransaction[]>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.transactions(),
    queryFn: async (): Promise<RawTransaction[]> => {
      const data = await getJson<{ transactions?: RawTransaction[] }>(
        '/api/transactions?limit=500', token,
      )
      const txs = Array.isArray(data?.transactions) ? data.transactions : []
      return txs.map(t => {
        try {
          return { ...t, category: normalizeCategory(t.category) }
        } catch {
          return { ...t, category: 'Other' }
        }
      })
    },
    staleTime: STALE_TIMES.default,
    ...opts,
  })
}

export function useAccountsQuery(opts?: QueryOpts<Account[]>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.accounts(),
    queryFn: async (): Promise<Account[]> => {
      const data = await getJson<{ accounts?: Account[] }>('/api/accounts', token)
      return Array.isArray(data?.accounts) ? data.accounts : []
    },
    staleTime: STALE_TIMES.short,
    ...opts,
  })
}

export function useCashflowQuery(opts?: QueryOpts<{ months: MonthlyData[]; spendingByCategory: SpendingCategory[] }>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.cashflow(),
    queryFn: async () => {
      const data = await getJson<{ months?: MonthlyData[]; spendingByCategory?: SpendingCategory[] }>(
        '/api/cashflow', token,
      )
      return {
        months: Array.isArray(data?.months) ? data.months : [],
        spendingByCategory: Array.isArray(data?.spendingByCategory) ? data.spendingByCategory : [],
      }
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useForecastQuery(opts?: QueryOpts<ForecastData | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.forecast(),
    queryFn: async (): Promise<ForecastData | null> => {
      const data = await getJson<ForecastData>('/api/forecast', token)
      if (data?.avgIncome === undefined) return null
      return data
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useScoreQuery(opts?: QueryOpts<ScoreReport | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.score(),
    queryFn: async (): Promise<ScoreReport | null> => {
      if (!token) return null
      const data = await getJson<{ report?: ScoreReport }>('/api/user/score', token)
      return data?.report ?? null
    },
    enabled: !!token,
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useOnboardingProfileQuery(opts?: QueryOpts<OnboardingProfile | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.onboarding(),
    queryFn: async (): Promise<OnboardingProfile | null> => {
      if (!token) return null
      const data = await getJson<{ profile?: OnboardingProfile }>('/api/user/onboarding', token)
      return data?.profile ?? null
    },
    enabled: !!token,
    staleTime: STALE_TIMES.veryLong,
    ...opts,
  })
}

export function useBenefitsQuery(opts?: QueryOpts<BenefitsData | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.benefits(),
    queryFn: async (): Promise<BenefitsData | null> => {
      if (!token) return null
      const data = await getJson<{
        benefits?: unknown
        extracted?: ExtractedBenefits | null
        crossCheck?: BenefitStatus[]
        actionItemsDone?: string[]
      }>('/api/user/benefits', token)
      if (!data?.benefits) return null
      return {
        extracted: data.extracted ?? null,
        crossCheck: data.crossCheck ?? [],
        actionItemsDone: data.actionItemsDone ?? [],
      }
    },
    enabled: !!token,
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useNetWorthHistoryQuery(opts?: QueryOpts<NetWorthHistory | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.networthHistory(),
    queryFn: async (): Promise<NetWorthHistory | null> => {
      const res = await fetch('/api/networth/history', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function usePortfolioQuery<T = unknown>(opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.portfolio(),
    queryFn: async (): Promise<T | null> => {
      const res = await fetch('/api/portfolio', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function usePortfolioHistoryQuery<T = unknown>(period?: string, opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.portfolioHistory(period),
    queryFn: async (): Promise<T | null> => {
      const url = period
        ? `/api/portfolio/history?period=${encodeURIComponent(period)}`
        : '/api/portfolio/history'
      const res = await fetch(url, { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useGoalsQuery<T = unknown>(opts?: QueryOpts<{ goals: T[]; hasOnboardingProfile?: boolean } | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.goals(),
    queryFn: async () => {
      const res = await fetch('/api/goals', { headers: authHeaders(token) })
      if (!res.ok) return null
      const data = await res.json()
      return {
        goals: (data?.goals ?? []) as T[],
        hasOnboardingProfile: data?.hasOnboardingProfile ?? false,
      }
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export interface RecurringResponse {
  recurring: unknown[]
  totalMonthlyEstimate: number
  totalCount: number
}

export function useRecurringQuery<T = unknown>(opts?: QueryOpts<{ recurring: T[]; totalMonthlyEstimate: number; totalCount: number }>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.recurring(),
    queryFn: async () => {
      const res = await fetch('/api/recurring', { headers: authHeaders(token) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return {
        recurring: (data?.recurring ?? []) as T[],
        totalMonthlyEstimate: data?.totalMonthlyEstimate ?? 0,
        totalCount: data?.totalCount ?? 0,
      }
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export function useRecurringExclusionsQuery(opts?: QueryOpts<Set<string>>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.recurringExclusions(),
    queryFn: async (): Promise<Set<string>> => {
      const res = await fetch('/api/recurring/exclusions', { headers: authHeaders(token) })
      if (!res.ok) return new Set()
      const data = await res.json()
      return new Set<string>(Array.isArray(data?.excluded) ? data.excluded : [])
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export function useOpportunityQuery<T = unknown>(opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.opportunity(),
    queryFn: async (): Promise<T | null> => {
      const res = await fetch('/api/opportunity', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export interface DashboardStateResponse {
  state: unknown
  rationale?: unknown
  heroMetrics?: Record<string, unknown>
  priorityMetrics?: Record<string, unknown>
  computedAt?: string
}

export function useDashboardStateQuery(opts?: QueryOpts<DashboardStateResponse | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.dashboardState(),
    queryFn: async (): Promise<DashboardStateResponse | null> => {
      const res = await fetch('/api/dashboard/state', { headers: authHeaders(token) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useBudgetQuery<T = unknown>(opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.budget(),
    queryFn: async (): Promise<T | null> => {
      const res = await fetch('/api/budget', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export function useBudgetActualsQuery<T = unknown>(opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.budgetActuals(),
    queryFn: async (): Promise<T | null> => {
      const res = await fetch('/api/budget/actuals', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export function useCashflowTrendsQuery<T = unknown>(opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.cashflowTrends(),
    queryFn: async (): Promise<T | null> => {
      const res = await fetch('/api/cashflow/trends', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.long,
    ...opts,
  })
}

export function useMerchantsQuery<T = unknown>(opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.merchants(),
    queryFn: async (): Promise<T | null> => {
      const res = await fetch('/api/merchants', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export function useChecklistQuery<T = unknown>(opts?: QueryOpts<T | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.checklist(),
    queryFn: async (): Promise<T | null> => {
      const res = await fetch('/api/checklist', { headers: authHeaders(token) })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: STALE_TIMES.medium,
    ...opts,
  })
}

export function useUpdateBudgetMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.budget()
      void inv.budgetActuals()
    },
  })
}

export function useRecommendBudgetMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/budget/recommend', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => inv.budget(),
  })
}

export function useSaveOnboardingMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      inv.onboarding()
      void inv.score()
      void inv.dashboardState()
    },
  })
}

export function useUploadBenefitsMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (form: FormData) => {
      const res = await fetch('/api/user/benefits/extract', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => inv.benefits(),
  })
}

export function useToggleChecklistItemMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/checklist/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify({ completed }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => inv.checklist(),
  })
}

export function useClearCompletedChecklistMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/checklist', {
        method: 'DELETE',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify({ completed: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => inv.checklist(),
  })
}

export function useMarkBenefitActionMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await fetch('/api/user/benefits/actions', {
        method: 'PATCH',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.benefits()
      void inv.checklist()
    },
  })
}

export function usePlaidLinkTokenQuery(opts?: QueryOpts<string | null>) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.plaidLinkToken(),
    queryFn: async (): Promise<string | null> => {
      const res = await fetch('/api/plaid/create-link-token', { headers: authHeaders(token) })
      if (!res.ok) return null
      const data = await res.json()
      return data?.linkToken ?? null
    },
    staleTime: STALE_TIMES.veryLong,
    enabled: !!token,
    ...opts,
  })
}

// ── Mutation helpers ─────────────────────────────────────────────────────────
// Each mutation hook accepts the token at call time and invalidates the right
// keys on success. Components call useMutation(...).mutate(...) as usual.

export function useInvalidate() {
  const qc = useQueryClient()
  return {
    accounts: () => qc.invalidateQueries({ queryKey: queryKeys.accounts() }),
    transactions: () => qc.invalidateQueries({ queryKey: queryKeys.transactions() }),
    networth: () => qc.invalidateQueries({ queryKey: queryKeys.networth() }),
    networthHistory: () => qc.invalidateQueries({ queryKey: queryKeys.networthHistory() }),
    cashflow: () => qc.invalidateQueries({ queryKey: queryKeys.cashflow() }),
    cashflowTrends: () => qc.invalidateQueries({ queryKey: queryKeys.cashflowTrends() }),
    forecast: () => qc.invalidateQueries({ queryKey: queryKeys.forecast() }),
    portfolio: () => qc.invalidateQueries({ queryKey: queryKeys.portfolio() }),
    goals: () => qc.invalidateQueries({ queryKey: queryKeys.goals() }),
    budget: () => qc.invalidateQueries({ queryKey: queryKeys.budget() }),
    budgetActuals: () => qc.invalidateQueries({ queryKey: queryKeys.budgetActuals() }),
    recurring: () => qc.invalidateQueries({ queryKey: queryKeys.recurring() }),
    recurringExclusions: () => qc.invalidateQueries({ queryKey: queryKeys.recurringExclusions() }),
    opportunity: () => qc.invalidateQueries({ queryKey: queryKeys.opportunity() }),
    dashboardState: () => qc.invalidateQueries({ queryKey: queryKeys.dashboardState() }),
    benefits: () => qc.invalidateQueries({ queryKey: queryKeys.benefits() }),
    onboarding: () => qc.invalidateQueries({ queryKey: queryKeys.onboarding() }),
    score: () => qc.invalidateQueries({ queryKey: queryKeys.score() }),
    checklist: () => qc.invalidateQueries({ queryKey: queryKeys.checklist() }),
    merchants: () => qc.invalidateQueries({ queryKey: queryKeys.merchants() }),
    everything: () => qc.invalidateQueries(),
  }
}

export interface PlaidExchangePayload {
  publicToken: string
  institutionName?: string
  accounts?: unknown[]
}

export function usePlaidExchangeMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (payload: PlaidExchangePayload) => {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.accounts()
      inv.transactions()
      inv.networth()
      inv.networthHistory()
      inv.portfolio()
      inv.dashboardState()
    },
  })
}

export function usePlaidSyncMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
        redirect: 'error',
      })
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Non-JSON response, status ${res.status}`)
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? 'Sync failed')
      return data as { updatedAccounts?: number; updatedTransactions?: number }
    },
    onSuccess: () => {
      inv.everything()
    },
  })
}

export function usePlaidResetMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/plaid/reset', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Reset failed')
      return data
    },
    onSuccess: () => {
      inv.everything()
    },
  })
}

export function useDeleteAccountMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.accounts()
      inv.transactions()
      inv.networth()
      inv.networthHistory()
      inv.forecast()
      inv.dashboardState()
    },
  })
}

export function useDeleteInstitutionMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (institutionName: string) => {
      const res = await fetch('/api/accounts/institution', {
        method: 'DELETE',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify({ institutionName }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.accounts()
      inv.transactions()
      inv.networth()
      inv.networthHistory()
      inv.dashboardState()
    },
  })
}

export function useExcludeRecurringMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (merchantName: string) => {
      const res = await fetch('/api/recurring/exclusions', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify({ merchantName }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.recurring()
      inv.recurringExclusions()
    },
  })
}

export interface ManualTransactionPayload {
  merchantName: string
  amount: number
  type?: string
  category: string
  date: string
  accountId: string
}

export function useAddManualTransactionMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (payload: ManualTransactionPayload) => {
      const res = await fetch('/api/transactions/manual', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      inv.transactions()
      inv.cashflow()
      inv.recurring()
      inv.networth()
    },
  })
}

export interface UpdateTransactionPayload {
  merchantName?: string
  category?: string | null
  applyToMerchant?: boolean
}

export function useUpdateTransactionMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: UpdateTransactionPayload }) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.transactions()
      inv.cashflow()
    },
  })
}

export function useUpdateTransactionTagsMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const res = await fetch(`/api/transactions/${id}/tags`, {
        method: 'PATCH',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify({ tags }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      inv.transactions()
    },
  })
}

export function useSaveChecklistMutation() {
  const token = useAuthToken()
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (items: unknown[]) => {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: authHeaders(token, 'application/json'),
        body: JSON.stringify({ items }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ created?: number }>
    },
    onSuccess: () => {
      inv.checklist()
    },
  })
}
