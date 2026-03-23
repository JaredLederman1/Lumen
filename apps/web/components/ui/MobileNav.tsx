'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts, spacing } from '@/lib/theme'

interface SubItem {
  href: string
  label: string
  icon: string
}

interface NavCategory {
  id: string
  label: string
  icon: string
  items: SubItem[]
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '\u25C8',
    items: [
      { href: '/dashboard',           label: 'Overview',  icon: '\u25A3' },
      { href: '/dashboard/profile',   label: 'Profile',   icon: '\u2662' },
      { href: '/dashboard/checklist', label: 'Checklist',  icon: '\u2611' },
    ],
  },
  {
    id: 'wealth',
    label: 'Wealth',
    icon: '\u2B21',
    items: [
      { href: '/dashboard/accounts',  label: 'Accounts',  icon: '\u2395' },
      { href: '/dashboard/portfolio', label: 'Portfolio',  icon: '\u25F2' },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: '\u2195',
    items: [
      { href: '/dashboard/transactions', label: 'Transactions', icon: '\u2194' },
      { href: '/dashboard/cashflow',     label: 'Cash Flow',    icon: '\u2261' },
      { href: '/dashboard/budget',       label: 'Budget',       icon: '\u25A4' },
      { href: '/dashboard/recurring',    label: 'Recurring',    icon: '\u21BB' },
    ],
  },
  {
    id: 'forecast',
    label: 'Plan',
    icon: '\u25B3',
    items: [
      { href: '/dashboard/forecast', label: 'Projections', icon: '\u2197' },
      { href: '/dashboard/goals',    label: 'Goals',       icon: '\u25CE' },
    ],
  },
  {
    id: 'intel',
    label: 'Intel',
    icon: '\u2609',
    items: [
      { href: '/dashboard/score',       label: 'Score',      icon: '\u2606' },
      { href: '/dashboard/benefits',    label: 'Benefits',   icon: '\u2726' },
      { href: '/dashboard/opportunity', label: 'Opp. Cost',  icon: '\u2234' },
    ],
  },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const isCategoryActive = (cat: NavCategory) =>
    cat.items.some(item =>
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href)
    )

  const isSubActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  const handleCategoryTap = (catId: string) => {
    setOpenCategory(prev => prev === catId ? null : catId)
  }

  const handleSubTap = () => {
    setOpenCategory(null)
  }

  const openCat = openCategory ? NAV_CATEGORIES.find(c => c.id === openCategory) : null

  return (
    <div style={{
      backgroundColor: colors.surface,
      borderTop: `1px solid ${colors.goldBorder}`,
      paddingBottom: 'env(safe-area-inset-bottom)',
      width: '100%',
      overflow: 'hidden',
    }}>
      <AnimatePresence mode="wait">
        {openCat ? (
          /* Subcategory tray replaces the main bar */
          <motion.div
            key={`sub-${openCat.id}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              height: 64,
              paddingLeft: 8,
              paddingRight: spacing.pagePad,
              gap: 4,
              overflowX: 'auto',
            }}
          >
            {/* Back button */}
            <button
              // onPress
              onClick={() => setOpenCategory(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: spacing.tapTarget,
                minWidth: 40,
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                fontSize: 16,
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              {'\u2190'}
            </button>

            {openCat.items.map(item => {
              const active = isSubActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // onPress
                  onClick={handleSubTap}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                    minHeight: spacing.tapTarget,
                    padding: '0 12px',
                    borderRadius: 2,
                    backgroundColor: active ? colors.goldSubtle : 'transparent',
                    border: active ? `1px solid ${colors.goldBorder}` : '1px solid transparent',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    fontSize: 14,
                    color: active ? colors.gold : colors.textMuted,
                    lineHeight: 1,
                  }}>
                    {item.icon}
                  </span>
                  <span style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    color: active ? colors.gold : colors.textMuted,
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </motion.div>
        ) : (
          /* Main category bar */
          <motion.nav
            key="categories"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              height: 64,
              width: '100%',
            }}
          >
            {NAV_CATEGORIES.map(cat => {
              const active = isCategoryActive(cat)
              return (
                <button
                  key={cat.id}
                  // onPress
                  onClick={() => handleCategoryTap(cat.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    minHeight: spacing.tapTarget,
                    background: 'transparent',
                    border: 'none',
                    borderTop: active ? `2px solid ${colors.gold}` : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span style={{
                    fontSize: 18,
                    color: active ? colors.gold : colors.textMuted,
                    lineHeight: 1,
                  }}>
                    {cat.icon}
                  </span>
                  <span style={{
                    fontFamily: fonts.mono,
                    fontSize: 9,
                    color: active ? colors.gold : colors.textMuted,
                    letterSpacing: '0.12em',
                  }}>
                    {cat.label.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  )
}
