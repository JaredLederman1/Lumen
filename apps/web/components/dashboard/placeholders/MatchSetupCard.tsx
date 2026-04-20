'use client'

import Link from 'next/link'
import WidgetCard from '../widgets/WidgetCard'

const cta: React.CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: '4px',
  padding: '9px 22px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-sans)',
  fontSize: '12px',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  display: 'inline-block',
}

export default function MatchSetupCard() {
  return (
    <WidgetCard
      label="401k match"
      title="Set up your employer match."
      subtitle="Set up your employer match to unlock your biggest opportunity. A contract upload takes thirty seconds."
    >
      <Link href="/onboarding" style={cta}>
        Upload contract
      </Link>
    </WidgetCard>
  )
}
