import type { Metadata } from 'next'
import LandingClient from './LandingClient'

export const metadata: Metadata = {
  title: "Lumen — You can't fix what you can't see",
  description: 'Financial clarity for high earners.',
}

export default function Page() {
  return (
    <>
      {/* Runs synchronously before React hydrates — ensures page always starts at top */}
      <script dangerouslySetInnerHTML={{ __html: 'history.scrollRestoration="manual";window.scrollTo(0,0);' }} />
      <LandingClient />
    </>
  )
}
