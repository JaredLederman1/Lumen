'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTransactionsQuery, useAccountsQuery } from '@/lib/queries'
import { detectRecurringMerchants } from '@/lib/data'
import TransactionRow from '@/components/ui/TransactionRow'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const emptyCopy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  margin: 0,
}

export default function RecentTransactionsWidget() {
  const { data: txData, isPending: txPending } = useTransactionsQuery()
  const { data: acctData, isPending: acctPending } = useAccountsQuery()
  const transactions = useMemo(() => txData ?? [], [txData])
  const accounts = useMemo(() => acctData ?? [], [acctData])
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id, a])),
    [accounts],
  )
  const recurring = useMemo(
    () => detectRecurringMerchants(transactions),
    [transactions],
  )

  if (txPending || acctPending) return <WidgetSkeleton variant="list" />

  return (
    <motion.div {...WIDGET_REVEAL}>
    <WidgetCard
      variant="list"
      eyebrow="Recent transactions"
      cta={
        transactions.length > 0 ? (
          <Link href="/dashboard/transactions" style={ctaLink}>
            View all &rarr;
          </Link>
        ) : undefined
      }
    >
      {transactions.length === 0 ? (
        <p style={emptyCopy}>No transactions yet.</p>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
        >
          {transactions.slice(0, 6).map(tx => {
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
                recurring={tx.merchantName ? recurring.has(tx.merchantName) : false}
              />
            )
          })}
        </motion.div>
      )}
    </WidgetCard>
    </motion.div>
  )
}
