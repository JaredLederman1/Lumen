import styles from './landing.module.css'

const SURFACES = [
  {
    label: 'Sentinel',
    title: 'Continuous watch over every detected default.',
    desc: 'New findings the moment they emerge. The watch never sleeps and never coasts.',
  },
  {
    label: 'Notifications',
    title: 'The watch reports.',
    desc: 'Each report includes the dollar consequence and the action to take.',
  },
  {
    label: 'Opportunity cost',
    title: 'Every default carries a number.',
    desc: 'Every number is yours, recalculated against your real balances and your real horizon.',
  },
  {
    label: 'Recovery counter',
    title: 'The total dollar gap, closing as you act.',
    desc: 'Each finding closed reduces the running total. The number moves only one direction.',
  },
]

export default function VigilanceSurfaces() {
  return (
    <section className={styles.section}>
      <p className={styles.sectionEyebrow}>What you see</p>
      <h2 className={styles.sectionHeadline}>
        Every finding has a number. Every number has a next step.
      </h2>

      <div className={styles.surfaceGrid}>
        {SURFACES.map((surface) => (
          <div
            key={surface.label}
            className={`${styles.surfaceCard} card-hoverable`}
          >
            <span className={styles.surfaceLabel}>{surface.label}</span>
            <h3 className={styles.surfaceTitle}>{surface.title}</h3>
            <p className={styles.surfaceDesc}>{surface.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
