'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { textInput } from './shared'

interface Option {
  value: string
  meta?: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  onSelect?: (option: Option) => void
  options: Option[]
  placeholder?: string
  ariaLabel?: string
  autoFocus?: boolean
  style?: CSSProperties
  wrapperStyle?: CSSProperties
  maxResults?: number
}

// Autocomplete input that always allows free text. Suggestions filter against
// the current value; typing anything outside the list remains a valid entry.
export function Autocomplete({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  ariaLabel,
  autoFocus,
  style,
  wrapperStyle,
  maxResults = 8,
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const q = value.trim().toLowerCase()
  const matches =
    q.length === 0
      ? []
      : options.filter(o => o.value.toLowerCase().includes(q)).slice(0, maxResults)

  useEffect(() => {
    setHighlight(0)
  }, [value])

  useEffect(() => {
    const onDocMouse = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouse)
    return () => document.removeEventListener('mousedown', onDocMouse)
  }, [])

  const choose = (idx: number) => {
    const opt = matches[idx]
    if (!opt) return
    onChange(opt.value)
    onSelect?.(opt)
    setOpen(false)
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', ...wrapperStyle }}
    >
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape' || e.key === 'Tab') {
            setOpen(false)
            return
          }
          if (!open || matches.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight(h => (h + 1) % matches.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight(h => (h - 1 + matches.length) % matches.length)
          } else if (e.key === 'Enter') {
            // Only steal Enter when the highlighted option differs from the
            // typed value. When they match, Enter falls through to the form
            // so the shell's Continue handler runs.
            const opt = matches[highlight]
            if (opt && opt.value.toLowerCase() !== q) {
              e.preventDefault()
              choose(highlight)
            }
          }
        }}
        style={style ?? textInput}
      />
      {open && matches.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            margin: 0,
            padding: '4px 0',
            listStyle: 'none',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            boxShadow: '0 8px 24px rgba(26,23,20,0.10)',
            maxHeight: '280px',
            overflowY: 'auto',
            zIndex: 20,
          }}
        >
          {matches.map((opt, i) => (
            <li
              key={`${opt.value}-${opt.meta ?? ''}-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={e => {
                e.preventDefault()
                choose(i)
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '15px',
                color: 'var(--color-text)',
                background: i === highlight ? 'rgba(184,145,58,0.08)' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span>{opt.value}</span>
              {opt.meta && (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  {opt.meta}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
