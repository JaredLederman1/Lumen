'use client'

import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTooltip } from '@/lib/tooltipContext'

const TOOLTIP_WIDTH = 280
const TOOLTIP_OFFSET = 12

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function getValueColor(type: string, value: number): string {
  if (type === 'account') return value >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'
  if (type === 'average') return 'var(--color-gold)'
  if (type === 'computed') return 'var(--color-text)'
  return 'var(--color-text-muted)'
}

export default function GlobalTooltipRenderer() {
  const { active } = useTooltip()

  if (!active) return null

  const { rect, title, total, sources, computationNote, accentColor } = active

  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
  left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 8))

  const estimatedHeight = 80 + sources.length * 44 + (computationNote ? 44 : 0)
  const top =
    rect.top - estimatedHeight - TOOLTIP_OFFSET < 8
      ? rect.bottom + TOOLTIP_OFFSET
      : rect.top - estimatedHeight - TOOLTIP_OFFSET

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top,
        left,
        width: TOOLTIP_WIDTH,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-gold-border)',
        borderRadius: '2px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--color-text-muted)',
          marginBottom: '10px',
        }}
      >
        {title}
      </p>

      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '22px',
          color: accentColor ?? 'var(--color-text)',
          marginBottom: '12px',
        }}
      >
        {formatCurrency(total)}
      </p>

      {computationNote && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {computationNote}
        </p>
      )}

      <div>
        {sources.map((source, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 0',
              borderBottom:
                i < sources.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text)',
                }}
              >
                {source.label}
              </p>
              {source.detail && (
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {source.detail}
                </p>
              )}
            </div>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '13px',
                color: accentColor ?? getValueColor(source.type, source.value),
              }}
            >
              {formatCurrency(source.value)}
            </p>
          </div>
        ))}
      </div>
    </motion.div>,
    document.body
  )
}
