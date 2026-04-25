'use client'

import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type {
  NotificationItem as NotificationItemData,
  NotificationKind,
} from '@/lib/queries'

interface Props {
  notification: NotificationItemData
  onSelect: (n: NotificationItemData) => void
  onDismiss: (id: string) => void
}

const KIND_LABEL: Record<NotificationKind, string> = {
  new: 'New',
  reopened: 'Reopened',
  worsened: 'Worsened',
}

const KIND_TONE: Record<NotificationKind, string> = {
  new: 'var(--color-gold)',
  reopened: 'var(--color-info)',
  worsened: 'var(--color-negative)',
}

const KIND_BG: Record<NotificationKind, string> = {
  new: 'var(--color-gold-subtle)',
  reopened: 'var(--color-info-bg)',
  worsened: 'var(--color-negative-bg)',
}

const DOMAIN_LABEL: Record<string, string> = {
  idle_cash: 'Idle cash',
  hysa: 'HYSA',
  debt: 'Debt',
  match: 'Employer match',
  benefits: 'Benefits',
  tax_advantaged: 'Tax-advantaged',
  subscription: 'Subscription',
}

function domainLabel(domain: string): string {
  return DOMAIN_LABEL[domain] ?? domain.replace(/_/g, ' ')
}

function formatRelative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime()
  if (delta < 2 * 60 * 1000) return 'just now'
  const minutes = Math.floor(delta / (60 * 1000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatDollar(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null
  const abs = Math.abs(value)
  if (abs < 1) return null
  if (abs >= 1000) {
    return `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k/yr`
  }
  return `$${Math.round(value)}/yr`
}

export default function NotificationItem({
  notification,
  onSelect,
  onDismiss,
}: Props) {
  const isUnread = notification.readAt === null
  const kind = notification.kind
  const tone = KIND_TONE[kind] ?? 'var(--color-text-muted)'
  const toneBg = KIND_BG[kind] ?? 'var(--color-surface-2)'
  const dollar = formatDollar(notification.dollarImpact)

  const itemStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '14px 18px 14px 22px',
    borderBottom: '0.5px solid var(--color-border)',
    backgroundColor: isUnread ? 'var(--color-gold-subtle)' : 'transparent',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    textAlign: 'left',
    width: '100%',
  }

  const accentStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: isUnread ? 'var(--color-gold)' : 'transparent',
  }

  const headerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  }

  const kindBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 'var(--radius-pill)',
    backgroundColor: toneBg,
    color: tone,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  }

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: 15,
    fontWeight: 400,
    color: 'var(--color-text)',
    lineHeight: 1.3,
  }

  const metaRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.04em',
  }

  const dismissStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 'var(--radius-sm)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 0,
    transition: 'color 150ms ease, background-color 150ms ease',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(notification)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(notification)
          }
        }}
        style={itemStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isUnread
            ? 'var(--color-surface-hover)'
            : 'var(--color-surface-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isUnread
            ? 'var(--color-gold-subtle)'
            : 'transparent'
        }}
      >
        <span aria-hidden="true" style={accentStyle} />
        <div style={headerRowStyle}>
          <span style={kindBadgeStyle}>{KIND_LABEL[kind] ?? kind}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss(notification.id)
            }}
            style={dismissStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text)'
              e.currentTarget.style.backgroundColor =
                'var(--color-surface-elevated)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div style={titleStyle}>{notification.title}</div>
        <div style={metaRowStyle}>
          <span>{domainLabel(notification.domain)}</span>
          {dollar && (
            <>
              <span aria-hidden="true">·</span>
              <span style={{ color: 'var(--color-text-mid)' }}>{dollar}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{formatRelative(notification.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  )
}
