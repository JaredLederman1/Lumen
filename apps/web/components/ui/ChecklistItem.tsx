'use client'

import { useState } from 'react'

interface ChecklistItemProps {
  text: string
  checked: boolean
  onChange?: (checked: boolean) => void
  onExplain?: (text: string) => Promise<string>
}

export default function ChecklistItem({ text, checked, onChange, onExplain }: ChecklistItemProps) {
  const [explanation, setExplanation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTextClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onExplain) return
    if (explanation !== null) {
      setExplanation(null)
      return
    }
    setLoading(true)
    try {
      const result = await onExplain(text)
      setExplanation(result)
    } catch {
      setExplanation('Could not load explanation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        {/* Checkbox */}
        <div
          onClick={() => onChange?.(!checked)}
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '3px',
            border: `1.5px solid ${checked ? 'var(--color-positive)' : 'var(--color-border-strong)'}`,
            backgroundColor: checked ? 'var(--color-positive)' : 'transparent',
            flexShrink: 0,
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 150ms ease, border-color 150ms ease',
            cursor: onChange ? 'pointer' : 'default',
          }}
        >
          {checked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path
                d="M1 3.5L3.5 6L8 1"
                stroke="var(--color-surface)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <span
          onClick={handleTextClick}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: checked ? 'var(--color-text-muted)' : 'var(--color-text)',
            textDecoration: checked ? 'line-through' : 'none',
            lineHeight: 1.5,
            transition: 'color 150ms ease',
            cursor: onExplain ? 'pointer' : 'default',
            borderBottom: onExplain && !checked ? '1px dotted var(--color-border-strong)' : 'none',
          }}
        >
          {text}
        </span>
      </div>

      {/* Explanation */}
      {loading && (
        <div style={{
          marginTop: '4px',
          marginLeft: '26px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
        }}>
          Loading...
        </div>
      )}
      {explanation && !loading && (
        <div style={{
          marginTop: '4px',
          marginLeft: '26px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-mid)',
          lineHeight: 1.5,
        }}>
          {explanation}
        </div>
      )}
    </div>
  )
}
