'use client'

import { Suspense, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NetWorthCard from '@/components/ui/NetWorthCard'
import NetWorthChart from '@/components/ui/NetWorthChart'
import NetWorthChartPlaceholder from '@/components/ui/NetWorthChartPlaceholder'
import DonutChart from '@/components/ui/DonutChart'
import BarChart from '@/components/ui/BarChart'
import TransactionRow from '@/components/ui/TransactionRow'
import MobileCard from '@/components/ui/MobileCard'
import { colors, fonts, spacing, mobileLabelText } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  useAccountsQuery,
  useCashflowQuery,
  useNetWorthHistoryQuery,
  useNetWorthQuery,
  useTransactionsQuery,
} from '@/lib/queries'
import { detectRecurringMerchants } from '@/lib/data'
import HeroRow from '@/components/dashboard/HeroRow'
import DashboardGrid from '@/components/dashboard/DashboardGrid'
import { useDashboardHeroState } from '@/components/dashboard/useDashboardHeroState'
import StabilityBadge from '@/components/watch/StabilityBadge'
import {
  useMockStabilityStates,
  MOCK_STABILITY_GAP_IDS,
} from '@/lib/vigilance/mockStabilityStates'
import SentinelWidget from '@/components/dashboard/widgets/SentinelWidget'
import NetWorthWidget from '@/components/dashboard/widgets/NetWorthWidget'
import RecoveryWidget from '@/components/dashboard/widgets/RecoveryWidget'
import AccountBalancesWidget from '@/components/dashboard/widgets/AccountBalancesWidget'
import SharpenForecastWidget from '@/components/dashboard/SharpenForecastWidget'
import WidgetSkeleton from '@/components/dashboard/widgets/WidgetSkeleton'
import {
  GRID_CELL_CLASS,
  GRID_ROW_CLASS,
  GRID_ROW_STYLE,
  computeRowLayout,
  gridCellStyle,
} from '@/components/dashboard/gridCell'

function fmtChange(n: number): string {
  const abs = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(n))
  return n >= 0 ? `+${abs}` : `-${abs}`
}

function DashboardDesktop() {
  const networthQ = useNetWorthQuery()
  const accountsQ = useAccountsQuery()
  const netWorth = networthQ.data ?? null
  const accounts = accountsQ.data ?? []
  const loading = networthQ.isLoading || accountsQ.isLoading
  const hero = useDashboardHeroState()
  const { data: nwHistory } = useNetWorthHistoryQuery()
  const stability = useMockStabilityStates('mixed')

  const hasData = netWorth !== null && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0)

  // HeroLiabilityOnly already tells the user to link a bank/investment
  // account, so suppress the legacy in-grid placeholder for that state.
  const showLiabilityOnlyPlaceholder =
    !!nwHistory && nwHistory.hasLiabilityAccount && !nwHistory.hasAssetAccount &&
    hero.state !== 'LIABILITY_ONLY'

  const heroBlock = hero.failed
    ? null
    : (
      <HeroRow
        state={hero.state}
        metrics={hero.heroMetrics}
        loading={hero.loading}
      />
    )

  if (!loading && !hasData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {heroBlock}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '400px', gap: '20px', textAlign: 'center',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border-strong)',
            backgroundColor: 'var(--color-gold-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
          }}>
            ◈
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: '#F0F2F8', marginBottom: '8px' }}>
              No data yet
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', lineHeight: 1.7 }}>
              Connect a bank account so Illumin can monitor your net worth, spending, and transactions.
            </p>
          </div>
          <Link
            href="/dashboard/accounts"
            style={{
              padding: '10px 24px',
              backgroundColor: '#B8913A',
              border: 'none',
              borderRadius: '2px',
              color: '#F0F2F8',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Connect an Account
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {heroBlock}
      {netWorth && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <NetWorthCard
            current={netWorth.current}
            lastMonth={netWorth.lastMonth}
            totalAssets={netWorth.totalAssets}
            totalLiabilities={netWorth.totalLiabilities}
            accounts={accounts}
          />
          <StabilityBadge
            state={stability.byGapId[MOCK_STABILITY_GAP_IDS.netWorth]}
            ariaContextLabel="Net worth stability"
          />
        </div>
      )}

      <HalfHalfRow
        left={<SentinelWidget />}
        right={
          <Suspense fallback={<WidgetSkeleton variant="chart" />}>
            <NetWorthWidget />
          </Suspense>
        }
      />

      {showLiabilityOnlyPlaceholder && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        >
          <NetWorthChartPlaceholder />
        </motion.div>
      )}

      {hero.state && !hero.failed && (
        <DashboardGrid
          state={hero.state}
          priorityMetrics={hero.priorityMetrics}
        />
      )}

      <HalfHalfRow
        left={
          <Suspense fallback={<WidgetSkeleton variant="metric" />}>
            <RecoveryWidget />
          </Suspense>
        }
        right={
          <Suspense fallback={<WidgetSkeleton variant="list" />}>
            <AccountBalancesWidget />
          </Suspense>
        }
      />
    </div>
  )
}

/**
 * A single dashboard grid row with two half-width cells (colSpan 3 on desktop,
 * 2 on tablet, 1 on mobile). Uses the same grid classes as the Priority /
 * Context / Reference rows so row gutter and breakpoint behavior match.
 */
function HalfHalfRow({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  const raw = [
    { colSpan: 3, rowSpan: 1 },
    { colSpan: 3, rowSpan: 1 },
  ]
  const { desktop, tablet } = computeRowLayout(raw)
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={GRID_ROW_CLASS}
      style={GRID_ROW_STYLE}
    >
      <div
        className={GRID_CELL_CLASS}
        style={gridCellStyle(desktop[0], tablet[0])}
      >
        {left}
      </div>
      <div
        className={GRID_CELL_CLASS}
        style={gridCellStyle(desktop[1], tablet[1])}
      >
        {right}
      </div>
    </motion.section>
  )
}

// ── Currency formatter (used by mobile layout) ────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// ── Mobile layout ─────────────────────────────────────────────────────────────
function DashboardMobile() {
  const networthQ = useNetWorthQuery()
  const accountsQ = useAccountsQuery()
  const transactionsQ = useTransactionsQuery()
  const cashflowQ = useCashflowQuery()
  const netWorth = networthQ.data ?? null
  const accounts = accountsQ.data ?? []
  const transactions = transactionsQ.data ?? []
  const monthlyData = cashflowQ.data?.months ?? []
  const spendingByCategory = cashflowQ.data?.spendingByCategory ?? []
  const loading =
    networthQ.isLoading ||
    accountsQ.isLoading ||
    transactionsQ.isLoading ||
    cashflowQ.isLoading
  const hero = useDashboardHeroState()
  const { data: nwHistory } = useNetWorthHistoryQuery()
  const stability = useMockStabilityStates('mixed')

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() => detectRecurringMerchants(transactions), [transactions])

  const hasData = netWorth !== null && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0)

  const hasFullBalanceSheet =
    !!nwHistory &&
    nwHistory.history.length >= 2 &&
    nwHistory.hasAssetAccount === true &&
    nwHistory.hasLiabilityAccount === true

  const showNetWorthChart =
    hasFullBalanceSheet ||
    (!!nwHistory && nwHistory.history.length >= 2 && nwHistory.hasAssetAccount && !nwHistory.hasLiabilityAccount)

  const showLiabilityOnlyPlaceholder =
    !!nwHistory && nwHistory.hasLiabilityAccount && !nwHistory.hasAssetAccount &&
    hero.state !== 'LIABILITY_ONLY'

  const heroBlock = hero.failed
    ? null
    : (
      <HeroRow
        state={hero.state}
        metrics={hero.heroMetrics}
        loading={hero.loading}
      />
    )

  if (!loading && !hasData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>
        {heroBlock}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '400px', gap: '20px', textAlign: 'center',
            paddingLeft: spacing.pagePad, paddingRight: spacing.pagePad,
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: `1px solid ${colors.goldBorder}`,
            backgroundColor: colors.goldSubtle,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
          }}>
            ◈
          </div>
          <div>
            <p style={{ fontFamily: fonts.serif, fontSize: '26px', fontWeight: 400, color: colors.text, marginBottom: '8px' }}>
              No data yet
            </p>
            <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, lineHeight: 1.7 }}>
              Connect a bank account so Illumin can monitor your net worth, spending, and transactions.
            </p>
          </div>
          <Link
            href="/dashboard/accounts"
            style={{
              padding: '12px 24px',
              minHeight: spacing.tapTarget,
              backgroundColor: colors.gold,
              border: 'none',
              borderRadius: '2px',
              color: colors.text,
              fontFamily: fonts.mono,
              fontSize: '13px',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Connect an Account
          </Link>
        </motion.div>
      </div>
    )
  }

  const sections = netWorth ? [
    // 1. Net worth hero card
    <motion.div
      key="nw-hero"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0 }}
    >
      <MobileCard>
        <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>NET WORTH</p>
        <p style={{ fontFamily: fonts.serif, fontSize: 32, fontWeight: 400, color: colors.positive, lineHeight: 1.1, marginBottom: 8 }}>
          {fmt(netWorth!.current)}
        </p>
        <div style={{ marginBottom: 6 }}>
          <StabilityBadge
            state={stability.byGapId[MOCK_STABILITY_GAP_IDS.netWorth]}
            ariaContextLabel="Net worth stability"
          />
        </div>
        {nwHistory && Math.abs(nwHistory.change30d) >= 1 && (
          <p style={{ fontFamily: fonts.mono, fontSize: 12, color: nwHistory.change30d >= 0 ? colors.positive : colors.negative, letterSpacing: '0.04em' }}>
            {fmtChange(nwHistory.change30d)} (30d)
          </p>
        )}
      </MobileCard>
    </motion.div>,

    // 2. Assets + Liabilities, demoted to secondary supporting context.
    //    Mirrors the desktop NetWorthCard hierarchy: net worth is the hero,
    //    these read as quiet annotations beneath it.
    <motion.div
      key="metrics"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.04 }}
      style={{ display: 'flex', gap: 24 }}
    >
      <div>
        <p className="ui-label" style={{ marginBottom: 4 }}>Total Assets</p>
        <p style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          fontWeight: 400,
          color: colors.textMid,
          lineHeight: 1.2,
          margin: 0,
        }}>
          {fmt(netWorth!.totalAssets)}
        </p>
      </div>
      <div>
        <p className="ui-label" style={{ marginBottom: 4 }}>Total Liabilities</p>
        <p style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          fontWeight: 400,
          color: colors.textMid,
          lineHeight: 1.2,
          margin: 0,
        }}>
          {fmt(netWorth!.totalLiabilities)}
        </p>
      </div>
    </motion.div>,

    // 3. Sentinel widget: concise vigilance summary with a link into the
    //    full Sentinel surface. Placed directly below the metric cards so it
    //    is the first thing after the headline numbers.
    <motion.div
      key="sentinel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.06 }}
    >
      <SentinelWidget />
    </motion.div>,

    // 4. Net worth chart (conditional). Liability-only renders the placeholder
    //    instead, since credit-card-only data is not a full net worth view.
    ...(showNetWorthChart ? [
      <motion.div
        key="nw-chart"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
      >
        <MobileCard>
          <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>NET WORTH OVER TIME</p>
          <NetWorthChart data={nwHistory!.history} height={180} />
        </MobileCard>
      </motion.div>,
    ] : showLiabilityOnlyPlaceholder ? [
      <motion.div
        key="nw-placeholder"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
      >
        <NetWorthChartPlaceholder />
      </motion.div>,
    ] : []),

    // Sharpen forecast: prompts the user to fill in extended profile fields
    // (career, household, compensation) so Illumin's Coach Engine can be more
    // precise. Self-hides when all 7 fields are filled, so it costs zero
    // dashboard space when complete. Position mirrors desktop, slotted
    // between the primary metrics cluster (sentinel + nw-chart) and the
    // spending/cashflow cluster (donut + bar).
    <motion.div
      key="sharpen-forecast"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.10 }}
    >
      <SharpenForecastWidget />
    </motion.div>,

    // 4. Spending by category
    <motion.div
      key="donut"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.12 }}
    >
      <MobileCard>
        <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>SPENDING BY CATEGORY</p>
        <DonutChart data={spendingByCategory} />
      </MobileCard>
    </motion.div>,

    // 5. 6-month bar chart
    <motion.div
      key="bar"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.16 }}
    >
      <MobileCard>
        <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>6-MONTH OVERVIEW</p>
        <BarChart data={monthlyData} />
      </MobileCard>
    </motion.div>,

    // 6. Recent transactions
    ...(transactions.length > 0 ? [
      <motion.div
        key="txns"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.20 }}
      >
        <MobileCard>
          <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>RECENT</p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {transactions.slice(0, 8).map((tx) => {
              const acct = accountMap[tx.accountId]
              return (
                <TransactionRow
                  key={tx.id}
                  id={tx.id}
                  merchantName={tx.merchantName}
                  amount={tx.amount}
                  category={tx.category}
                  date={tx.date}
                  pending={tx.pending}
                  accountName={acct?.institutionName ?? null}
                  last4={acct?.last4 ?? null}
                  recurring={tx.merchantName ? recurringMerchants.has(tx.merchantName) : false}
                />
              )
            })}
          </motion.div>
        </MobileCard>
      </motion.div>,
    ] : []),
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>
      {heroBlock}
      {sections}
    </div>
  )
}

// ── Device-aware default export ───────────────────────────────────────────────
export default function DashboardPage() {
  const isMobile = useIsMobile() ?? true
  return isMobile ? <DashboardMobile /> : <DashboardDesktop />
}
