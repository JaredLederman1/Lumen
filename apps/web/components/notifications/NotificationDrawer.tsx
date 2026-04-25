'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  useDismissNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  type NotificationItem as NotificationItemData,
} from '@/lib/queries'
import NotificationItem from './NotificationItem'

interface Props {
  open: boolean
  onClose: () => void
}

type FilterTab = 'unread' | 'all'

export default function NotificationDrawer({ open, onClose }: Props) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const router = useRouter()
  const query = useNotificationsQuery({ filter })
  const markRead = useMarkNotificationReadMutation()
  const markAllRead = useMarkAllNotificationsReadMutation()
  const dismiss = useDismissNotificationMutation()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  const notifications = useMemo<NotificationItemData[]>(
    () => query.data?.pages.flatMap(p => p.notifications) ?? [],
    [query.data],
  )
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0

  const handleSelect = (n: NotificationItemData) => {
    if (!n.readAt) markRead.mutate(n.id)
    onClose()
    router.push('/dashboard/sentinel')
  }

  const handleDismiss = (id: string) => {
    dismiss.mutate(id)
  }

  const handleMarkAll = () => {
    if (unreadCount === 0) return
    markAllRead.mutate()
  }

  const scrimStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 100,
  }

  const panelStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'var(--color-surface)',
    borderLeft: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 101,
    boxShadow: '-24px 0 60px rgba(0, 0, 0, 0.35)',
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px 12px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  }

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: 18,
    fontWeight: 400,
    color: 'var(--color-text)',
    margin: 0,
    letterSpacing: '0.01em',
  }

  const closeStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 'var(--radius-sm)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 0,
    transition: 'color 150ms ease, background-color 150ms ease',
  }

  const toolbarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderBottom: '0.5px solid var(--color-border)',
    flexShrink: 0,
    gap: 12,
  }

  const tabsWrapStyle: CSSProperties = {
    display: 'inline-flex',
    gap: 4,
  }

  const tabButtonStyle = (active: boolean): CSSProperties => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '5px 12px',
    borderRadius: 'var(--radius-pill)',
    border: `1px solid ${active ? 'var(--color-gold-border)' : 'transparent'}`,
    backgroundColor: active ? 'var(--color-gold-subtle)' : 'transparent',
    color: active ? 'var(--color-gold)' : 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'color 150ms ease, background-color 150ms ease',
  })

  const markAllStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: unreadCount > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)',
    background: 'none',
    border: 'none',
    cursor: unreadCount > 0 ? 'pointer' : 'default',
    padding: '4px 0',
    opacity: markAllRead.isPending ? 0.5 : 1,
  }

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  }

  const emptyWrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 28px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.04em',
    lineHeight: 1.6,
    flex: 1,
  }

  const errorWrapStyle: CSSProperties = {
    ...emptyWrapStyle,
    color: 'var(--color-negative)',
  }

  const retryButtonStyle: CSSProperties = {
    marginTop: 12,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-gold)',
    background: 'none',
    border: '1px solid var(--color-gold-border)',
    borderRadius: 'var(--radius-pill)',
    padding: '5px 14px',
    cursor: 'pointer',
  }

  const loadMoreStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    background: 'none',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-pill)',
    padding: '6px 14px',
    cursor: 'pointer',
    margin: '14px auto 22px',
    display: 'block',
    transition: 'color 150ms ease, border-color 150ms ease',
  }

  const skeletonRowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '14px 18px 14px 22px',
    borderBottom: '0.5px solid var(--color-border)',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={scrimStyle}
            aria-hidden="true"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={panelStyle}
          >
            <div style={headerStyle}>
              <h2 style={titleStyle}>Notifications</h2>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={onClose}
                style={closeStyle}
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
                  width="16"
                  height="16"
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

            <div style={toolbarStyle}>
              <div style={tabsWrapStyle}>
                <button
                  type="button"
                  style={tabButtonStyle(filter === 'all')}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  style={tabButtonStyle(filter === 'unread')}
                  onClick={() => setFilter('unread')}
                >
                  Unread{unreadCount > 0 ? ` · ${unreadCount}` : ''}
                </button>
              </div>
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={unreadCount === 0 || markAllRead.isPending}
                style={markAllStyle}
              >
                Mark all read
              </button>
            </div>

            <div style={bodyStyle}>
              {query.isLoading && notifications.length === 0 && (
                <div>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={skeletonRowStyle}>
                      <motion.div
                        aria-hidden="true"
                        animate={{ opacity: [0.45, 0.85, 0.45] }}
                        transition={{
                          duration: 1.5,
                          ease: 'easeInOut',
                          repeat: Infinity,
                        }}
                        style={{
                          width: '40%',
                          height: 10,
                          backgroundColor: 'var(--color-surface-2)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      />
                      <motion.div
                        aria-hidden="true"
                        animate={{ opacity: [0.45, 0.85, 0.45] }}
                        transition={{
                          duration: 1.5,
                          ease: 'easeInOut',
                          repeat: Infinity,
                        }}
                        style={{
                          width: '75%',
                          height: 14,
                          backgroundColor: 'var(--color-surface-2)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      />
                      <motion.div
                        aria-hidden="true"
                        animate={{ opacity: [0.45, 0.85, 0.45] }}
                        transition={{
                          duration: 1.5,
                          ease: 'easeInOut',
                          repeat: Infinity,
                        }}
                        style={{
                          width: '55%',
                          height: 10,
                          backgroundColor: 'var(--color-surface-2)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {query.isError && (
                <div style={errorWrapStyle}>
                  <div>Could not load notifications.</div>
                  <button
                    type="button"
                    onClick={() => void query.refetch()}
                    style={retryButtonStyle}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!query.isLoading &&
                !query.isError &&
                notifications.length === 0 && (
                  <div style={emptyWrapStyle}>
                    <div>No findings to review. Illumin is watching.</div>
                  </div>
                )}

              {notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onSelect={handleSelect}
                  onDismiss={handleDismiss}
                />
              ))}

              {query.hasNextPage && notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  style={loadMoreStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-gold)'
                    e.currentTarget.style.borderColor =
                      'var(--color-border-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                    e.currentTarget.style.borderColor =
                      'var(--color-border-strong)'
                  }}
                >
                  {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
