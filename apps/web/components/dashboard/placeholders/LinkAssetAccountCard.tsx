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

export default function LinkAssetAccountCard() {
  return (
    <WidgetCard
      label="Unlock savings view"
      title="Link an asset account."
      subtitle="Add a checking, savings, or investment account to see your full balance sheet and savings-rate trends."
    >
      <Link href="/dashboard/accounts" style={cta}>
        Link account
      </Link>
    </WidgetCard>
  )
}
