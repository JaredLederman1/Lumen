'use client'

import { createContext, useContext, useCallback, ReactNode, Dispatch, SetStateAction } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAuthToken,
  useAuthEmail,
  useNetWorthQuery,
  useTransactionsQuery,
  useAccountsQuery,
  useCashflowQuery,
  useForecastQuery,
  useScoreQuery,
  useOnboardingProfileQuery,
  useBenefitsQuery,
  queryKeys,
  type NetWorthData,
  type RawTransaction as Transaction,
  type Account,
  type MonthlyData,
  type SpendingCategory,
  type ForecastData,
  type OnboardingProfile,
  type BenefitsData,
} from '@/lib/queries'
import type { ScoreReport } from '@illumin/types'

// Re-export the types so existing imports `from '@/lib/dashboardData'` keep working.
export type {
  NetWorthData,
  Transaction,
  Account,
  MonthlyData,
  SpendingCategory,
  ForecastData,
  OnboardingProfile,
  BenefitsData,
}

interface DashboardContextValue {
  loading: boolean
  authToken: string | null
  email: string | null
  netWorth: NetWorthData | null
  transactions: Transaction[]
  accounts: Account[]
  setAccounts: Dispatch<SetStateAction<Account[]>>
  monthlyData: MonthlyData[]
  spendingByCategory: SpendingCategory[]
  forecast: ForecastData | null
  scoreReport: ScoreReport | null
  profile: OnboardingProfile | null
  setProfile: Dispatch<SetStateAction<OnboardingProfile | null>>
  benefits: BenefitsData | null
  setBenefits: Dispatch<SetStateAction<BenefitsData | null>>
  refresh: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider')
  return ctx
}

function applyUpdate<T>(setter: SetStateAction<T>, current: T): T {
  if (typeof setter === 'function') {
    return (setter as (prev: T) => T)(current)
  }
  return setter
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const authToken = useAuthToken()
  const email = useAuthEmail()

  const networthQ = useNetWorthQuery()
  const transactionsQ = useTransactionsQuery()
  const accountsQ = useAccountsQuery()
  const cashflowQ = useCashflowQuery()
  const forecastQ = useForecastQuery()
  const scoreQ = useScoreQuery()
  const profileQ = useOnboardingProfileQuery()
  const benefitsQ = useBenefitsQuery()

  // Derived setters that update the cache rather than local state, so
  // children that previously held local copies stay in sync with peers.
  const setAccounts: Dispatch<SetStateAction<Account[]>> = useCallback(value => {
    qc.setQueryData<Account[]>(queryKeys.accounts(), prev => applyUpdate(value, prev ?? []))
  }, [qc])

  const setProfile: Dispatch<SetStateAction<OnboardingProfile | null>> = useCallback(value => {
    qc.setQueryData<OnboardingProfile | null>(queryKeys.onboarding(), prev => applyUpdate(value, prev ?? null))
  }, [qc])

  const setBenefits: Dispatch<SetStateAction<BenefitsData | null>> = useCallback(value => {
    qc.setQueryData<BenefitsData | null>(queryKeys.benefits(), prev => applyUpdate(value, prev ?? null))
  }, [qc])

  const refresh = useCallback(async () => {
    await qc.invalidateQueries()
  }, [qc])

  // The dashboard is "loading" only while the core balance-sheet queries are
  // still on their first fetch. Score/profile/benefits are token-gated and
  // not required to show the shell.
  const loading =
    networthQ.isLoading ||
    accountsQ.isLoading ||
    transactionsQ.isLoading ||
    cashflowQ.isLoading ||
    forecastQ.isLoading

  const value: DashboardContextValue = {
    loading,
    authToken,
    email,
    netWorth: networthQ.data ?? null,
    transactions: transactionsQ.data ?? [],
    accounts: accountsQ.data ?? [],
    setAccounts,
    monthlyData: cashflowQ.data?.months ?? [],
    spendingByCategory: cashflowQ.data?.spendingByCategory ?? [],
    forecast: forecastQ.data ?? null,
    scoreReport: scoreQ.data ?? null,
    profile: profileQ.data ?? null,
    setProfile,
    benefits: benefitsQ.data ?? null,
    setBenefits,
    refresh,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}
