'use client'

import styles from './page.module.css'
import ScrollReveal from './ScrollReveal'

const TRANSACTIONS = [
  { category: 'Food',         merchant: 'Whole Foods Market',   amount: '-$87.50'  },
  { category: 'Transport',    merchant: 'Uber',                  amount: '-$14.20'  },
  { category: 'Utilities',    merchant: 'Con Edison',            amount: '-$124.00' },
  { category: 'Dining',       merchant: 'Blue Bottle Coffee',    amount: '-$6.50'   },
  { category: 'Software',     merchant: 'Adobe Creative Cloud',  amount: '-$54.99'  },
]

const CASH_FLOW = [
  { label: 'Income',   value: '$5,200', fill: 80 },
  { label: 'Expenses', value: '$3,140', fill: 50 },
  { label: 'Savings',  value: '$780',   fill: 20 },
]

const SUBSCRIPTIONS = [
  { name: 'Netflix',          amount: '$15.99/mo', status: 'ACTIVE'   },
  { name: 'Spotify',          amount: '$9.99/mo',  status: 'ACTIVE'   },
  { name: 'Adobe Creative',   amount: '$54.99/mo', status: 'UPCOMING' },
  { name: 'iCloud+',          amount: '$2.99/mo',  status: 'ACTIVE'   },
]

export default function FeaturesSection() {
  return (
    <section className={styles.features}>

      <ScrollReveal>
        <div className={styles.featuresHeader}>
          <h2 id="features-headline" className={styles.featuresHeadline}>What Illumin sees.</h2>
          <p className={styles.featuresDesc}>
            Every account, every transaction, every pattern. Continuously monitored, automatically classified, reported as findings.
          </p>
        </div>
      </ScrollReveal>

      {/* ── ROW 1: Spending Intelligence ──────────────────── */}
      <ScrollReveal>
        <div className={`${styles.featureRow} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Spending Intelligence</span>
            <h3 className={styles.featureH3}>Every transaction, on the record.</h3>
            <p className={styles.featureText}>
              Transactions classified automatically, against rules you set. Set a rule once. Illumin enforces it on every charge that follows.
            </p>
          </div>
          <div className={styles.featureRight}>
            <div className={`card ${styles.mockCard}`}>
              {TRANSACTIONS.map((tx) => (
                <div key={tx.merchant} className={styles.txRow}>
                  <span className={styles.txCategory}>{tx.category}</span>
                  <span className={styles.txMerchant}>{tx.merchant}</span>
                  <span className={styles.txAmount}>{tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── ROW 2: Cash Flow ──────────────────────────────── */}
      <ScrollReveal>
        <div className={`${styles.featureRow} ${styles.featureRowReverse} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Cash Flow</span>
            <h3 className={styles.featureH3}>Income in. Expenses out. Illumin screens both.</h3>
            <p className={styles.featureText}>
              A month-by-month record of what comes in and what goes out. Illumin screens the pattern and reports the moment a number drifts.
            </p>
          </div>
          <div className={styles.featureRight}>
            <div className={`card ${styles.mockCard}`}>
              {CASH_FLOW.map((row) => (
                <div key={row.label} className={styles.barRow}>
                  <span className={styles.barLabel}>{row.label}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${row.fill}%` }} />
                  </div>
                  <span className={styles.barValue}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── ROW 3: Subscriptions ──────────────────────────── */}
      <ScrollReveal>
        <div className={`${styles.featureRow} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Subscriptions</span>
            <h3 className={styles.featureH3}>The charges that renew on their own.</h3>
            <p className={styles.featureText}>
              Every recurring charge pulled from your transaction history. No manual entry. Illumin reports the real monthly total of every subscription still drawing on your account.
            </p>
          </div>
          <div className={styles.featureRight}>
            <div className={`card ${styles.mockCard}`}>
              {SUBSCRIPTIONS.map((sub) => (
                <div key={sub.name} className={styles.subRow}>
                  <span className={styles.subName}>{sub.name}</span>
                  <span className={styles.subAmount}>{sub.amount}</span>
                  <span className={`${styles.subBadge} ${sub.status === 'UPCOMING' ? styles.upcoming : ''}`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

    </section>
  )
}
