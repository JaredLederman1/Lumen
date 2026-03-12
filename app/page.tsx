import type { Metadata } from 'next'
import LandingClient from './LandingClient'

export const metadata: Metadata = {
  title: "Lumen — You can't fix what you can't see",
  description: 'Financial clarity for high earners.',
}

export default function Page() {
  return <LandingClient />
}
