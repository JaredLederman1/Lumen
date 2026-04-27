import styles from './landingpreview.module.css'

const WATCH_ITEMS = [
  {
    label: '401k match',
    body:
      "Every payroll cycle, Illumin checks whether you've captured your full employer match. The gap, in dollars, year over year, surfaces the moment it changes.",
  },
  {
    label: 'Idle cash',
    body:
      'Illumin watches what your cash earns versus what it could earn. The HYSA gap is recalculated continuously.',
  },
  {
    label: 'Subscription drift',
    body:
      'Illumin catches new subscriptions the day they start charging and recurring charges the day they increase.',
  },
  {
    label: 'Category overspend',
    body:
      'Illumin sees when a spending category breaches your budget or your three-month average. The dollar overrun is named, not buried in a chart.',
  },
]

export default function WhatTheWatchSees() {
  return (
    <section id="the-watch" className={styles.section}>
      <p className={styles.sectionEyebrow}>The watch</p>
      <h2 className={styles.sectionHeadline}>
        Illumin watches every default that costs you money.
      </h2>

      <div className={styles.watchList}>
        {WATCH_ITEMS.map((item) => (
          <div key={item.label} className={styles.watchItem}>
            <span className={styles.watchItemLabel}>{item.label}</span>
            <p className={styles.watchItemBody}>{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
