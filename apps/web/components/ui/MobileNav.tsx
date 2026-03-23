'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { colors, fonts, spacing } from '@/lib/theme'

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Home',    icon: '\u25C8' },
  { href: '/dashboard/transactions', label: 'Activity', icon: '\u2195' },
  { href: '/dashboard/budget',       label: 'Budget',  icon: '\u25A4' },
  { href: '/dashboard/portfolio',    label: 'Invest',  icon: '\u25F2' },
  { href: '/dashboard/score',        label: 'Score',   icon: '\u25CE' },
]

export default function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <nav style={{
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTop: `1px solid ${colors.goldBorder}`,
      paddingBottom: 'env(safe-area-inset-bottom)',
      height: 64,
    }}>
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              minHeight: spacing.tapTarget,
              borderTop: active ? `2px solid ${colors.gold}` : '2px solid transparent',
              backgroundColor: active ? colors.goldSubtle : 'transparent',
            }}
          >
            <span style={{
              fontSize: 18,
              color: active ? colors.gold : colors.textMuted,
              lineHeight: 1,
            }}>
              {item.icon}
            </span>
            <span style={{
              fontFamily: fonts.mono,
              fontSize: 9,
              color: active ? colors.gold : colors.textMuted,
              letterSpacing: '0.12em',
            }}>
              {item.label.toUpperCase()}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
