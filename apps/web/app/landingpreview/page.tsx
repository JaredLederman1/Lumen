import type { Metadata } from 'next'
import FloatingNav from '../FloatingNav'
import HeroWatchReport from '@/components/landingpreview/HeroWatchReport'
import WhatTheWatchSees from '@/components/landingpreview/WhatTheWatchSees'
import VigilanceSurfaces from '@/components/landingpreview/VigilanceSurfaces'
import Differentiator from '@/components/landingpreview/Differentiator'
import AdFreeStatement from '@/components/landingpreview/AdFreeStatement'
import TaglineFinalCTA from '@/components/landingpreview/TaglineFinalCTA'
import styles from '@/components/landingpreview/landingpreview.module.css'

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
