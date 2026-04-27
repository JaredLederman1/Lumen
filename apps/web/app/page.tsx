import type { Metadata } from 'next'
import FloatingNav from './FloatingNav'
import HeroWatchReport from '@/components/landing/HeroWatchReport'
import WhatTheWatchSees from '@/components/landing/WhatTheWatchSees'
import VigilanceSurfaces from '@/components/landing/VigilanceSurfaces'
import Differentiator from '@/components/landing/Differentiator'
import AdFreeStatement from '@/components/landing/AdFreeStatement'
import TaglineFinalCTA from '@/components/landing/TaglineFinalCTA'
import styles from '@/components/landing/landing.module.css'

export const metadata: Metadata = {
  title: "Illumin: You can't fix what you can't see.",
  description:
    'Illumin watches your financial defaults so you can act on what they cost you.',
}

export default function Page() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: 'history.scrollRestoration="manual";window.scrollTo(0,0);',
        }}
      />
      <FloatingNav />

      <div className={styles.page}>
        <HeroWatchReport />
        <WhatTheWatchSees />
        <VigilanceSurfaces />
        <Differentiator />
        <AdFreeStatement />
        <TaglineFinalCTA />

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <span className={styles.footerWordmark}>Illumin</span>
            <span className={styles.footerCopy}>© 2026 Illumin</span>
          </div>
        </footer>
      </div>
    </>
  )
}
