'use client'

import { useState, type CSSProperties } from 'react'
import { useNotificationsQuery } from '@/lib/queries'
import NotificationDrawer from './NotificationDrawer'

interface Props {
  style?: CSSProperties
}

export default function NotificationBell({ style }: Props) {
  const [open, setOpen] = useState(false)

  // Pulls the unread count from the latest 'unread' page. We use limit=1 since
  // the body is unused here; only unreadCount matters.
  const query = useNotificationsQuery({ filter: 'unread', limit: 1 })
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0

  const buttonStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    background: 'none',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-pill)',
    color: 'var(--color-text-mid)',
    cursor: 'pointer',
    padding: 0,
    transition: 'color 150ms ease, border-color 150ms ease',
    lineHeight: 0,
    ...style,
  }

  const badgeStyle: CSSProperties = {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    padding: '0 4px',
    borderRadius: 'var(--radius-pill)',
    backgroundColor: 'var(--color-gold)',
    color: 'var(--color-bg)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.02em',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--color-surface)',
    lineHeight: 1,
  }

  return (
    <>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        onClick={() => setOpen(true)}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-gold)'
          e.currentTarget.style.borderColor = 'var(--color-border-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-mid)'
          e.currentTarget.style.borderColor = 'var(--color-border-strong)'
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={badgeStyle} aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <NotificationDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
