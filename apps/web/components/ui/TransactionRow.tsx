'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, type Variants } from 'framer-motion'

import { CATEGORIES as ALL_CATEGORIES } from '@/lib/categories'
import { useUpdateTransactionTagsMutation } from '@/lib/queries'

type DisputeOption = 'unrecognized' | 'incorrect_amount' | 'duplicate'

const DISPUTE_RESPONSES: Record<DisputeOption, { label: string; response: string }> = {
  unrecognized: {
    label: "I don't recognize this charge",
    response:
      'Contact your card issuer to dispute this transaction. Most issuers have a dispute option directly in their app or website.',
  },
  incorrect_amount: {
    label: 'The amount seems incorrect',
    response:
      "Contact the merchant first: billing errors are usually resolved faster this way. If they don't respond, dispute through your card issuer.",
  },
  duplicate: {
    label: 'This is a duplicate',
    response:
      "Check if this is a pending transaction that has since settled. If it's a true duplicate, dispute it through your card issuer.",
  },
}

interface TransactionRowProps {
  id: string
  merchantName: string | null
  amount: number
  category: string | null
  date: Date | string
  pending?: boolean
  accountName?: string | null
  last4?: string | null
  recurring?: boolean
  tags?: string[]
  needsLabeling?: boolean
  editingRowId?: string | null
  onEditRow?: (id: string | null) => void
  onSave?: (id: string, fields: { merchantName?: string; category?: string; applyToMerchant?: boolean }) => Promise<void>
  onCategoryChange?: (id: string, category: string, merchantName?: string) => void
  onTagsChange?: (id: string, tags: string[]) => void
}

function formatCurrency(n: number) {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(abs)
  return n < 0 ? `-${formatted}` : `+${formatted}`
}

function formatCategory(cat: string) {
  return cat.replace(/\s*—\s*/g, ' ').replace(/_/g, ' ')
}

function formatDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Plaid often returns merchant names in all caps. Convert those to title case
// so rows do not shout. Leave names that already contain lowercase letters
// alone so properly cased brands (e.g. "iRobot") keep their styling.
function formatMerchant(name: string | null | undefined): string {
  if (!name) return 'Unknown merchant'
  if (/[a-z]/.test(name)) return name
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase())
}

export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

export default function TransactionRow({
  id, merchantName, amount, category, date, pending,
  accountName, last4, recurring, tags = [],
  needsLabeling,
  editingRowId, onEditRow, onSave,
  onCategoryChange, onTagsChange,
}: TransactionRowProps) {
  const isIncome = amount > 0
  const isEditing = editingRowId === id
  const [saving, setSaving] = useState(false)
  const [hovered, setHovered] = useState(false)
  const updateTags = useUpdateTransactionTagsMutation()

  // Inline edit fields
  const [editMerchant, setEditMerchant] = useState(merchantName ?? '')
  const [editCategory, setEditCategory] = useState(category ?? 'Other')
  const [applyToMerchant, setApplyToMerchant] = useState<boolean>(!!needsLabeling)

  // Dispute state: null = edit mode, DisputeOption = showing a specific response
  const [disputeView, setDisputeView] = useState<'menu' | DisputeOption | null>(null)

  // Tag editor state
  const [tagEditorOpen, setTagEditorOpen] = useState(false)
  const [editingTags, setEditingTags] = useState<string[]>(tags)
  const [tagInput, setTagInput] = useState('')
  const tagEditorRef = useRef<HTMLDivElement>(null)
  const tagBtnRef = useRef<HTMLButtonElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const originalTagsRef = useRef<string[]>(tags)

  const rowRef = useRef<HTMLDivElement>(null)
  const merchantInputRef = useRef<HTMLInputElement>(null)

  const accountLabel = accountName
    ? last4 ? `${accountName} ····${last4}` : accountName
    : null

  // Reset edit fields when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditMerchant(merchantName ?? '')
      setEditCategory(category ?? 'Other')
      setApplyToMerchant(!!needsLabeling)
      setDisputeView(null)
      setTimeout(() => {
        merchantInputRef.current?.focus()
        merchantInputRef.current?.select()
        if (needsLabeling) {
          rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 0)
    }
  }, [isEditing, merchantName, category, needsLabeling])

  const cancelEdit = useCallback(() => {
    onEditRow?.(null)
  }, [onEditRow])

  const commitEdit = useCallback(async () => {
    const changes: { merchantName?: string; category?: string; applyToMerchant?: boolean } = {}
    if (editMerchant !== (merchantName ?? '')) changes.merchantName = editMerchant
    if (editCategory !== (category ?? 'Other')) changes.category = editCategory

    if (Object.keys(changes).length === 0) {
      cancelEdit()
      return
    }

    if (changes.category) changes.applyToMerchant = applyToMerchant

    setSaving(true)
    try {
      await onSave?.(id, changes)
      onEditRow?.(null)
    } finally {
      setSaving(false)
    }
  }, [id, editMerchant, editCategory, merchantName, category, applyToMerchant, onSave, onEditRow, cancelEdit])

  // Click outside to cancel
  useEffect(() => {
    if (!isEditing) return
    function handleClickOutside(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        cancelEdit()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, cancelEdit])

  // Escape to cancel
  useEffect(() => {
    if (!isEditing) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelEdit()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isEditing, cancelEdit])

  function handleRowClick() {
    if (saving || tagEditorOpen) return
    if (isEditing) {
      cancelEdit()
      return
    }
    onEditRow?.(id)
  }

  // Tag editor functions
  function openTagEditor(e: React.MouseEvent) {
    e.stopPropagation()
    setEditingTags([...tags])
    originalTagsRef.current = [...tags]
    setTagInput('')
    setTagEditorOpen(true)
    setTimeout(() => tagInputRef.current?.focus(), 0)
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (tag && !editingTags.includes(tag)) {
      setEditingTags(prev => [...prev, tag])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setEditingTags(prev => prev.filter(t => t !== tag))
  }

  async function saveTags(newTags: string[]) {
    try {
      await updateTags.mutateAsync({ id, tags: newTags })
    } catch (err) {
      console.error('[TransactionRow] tag save failed:', err)
    }
  }

  async function closeTagEditor() {
    setTagEditorOpen(false)
    const changed =
      editingTags.length !== originalTagsRef.current.length ||
      editingTags.some((t, i) => t !== originalTagsRef.current[i])
    if (!changed) return

    onTagsChange?.(id, editingTags)
    await saveTags(editingTags)
  }

  useEffect(() => {
    if (!tagEditorOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (
        tagEditorRef.current &&
        !tagEditorRef.current.contains(e.target as Node) &&
        tagBtnRef.current &&
        !tagBtnRef.current.contains(e.target as Node)
      ) {
        closeTagEditor()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const displayCategory = category

  // Inline edit panel (rendered inside the row, expands padding)
  const renderEditPanel = () => {
    if (!isEditing) return null

    // Dispute menu view
    if (disputeView === 'menu') {
      return (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            paddingTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}>
            What seems wrong?
          </p>
          {(Object.keys(DISPUTE_RESPONSES) as DisputeOption[]).map(key => (
            <button
              key={key}
              onClick={() => setDisputeView(key)}
              style={{
                textAlign: 'left',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: '2px',
                padding: '10px 12px',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              {DISPUTE_RESPONSES[key].label}
            </button>
          ))}
          <button
            onClick={() => setDisputeView(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 0',
              textAlign: 'left',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Back to edit
          </button>
        </div>
      )
    }

    // Dispute response view
    if (disputeView) {
      const info = DISPUTE_RESPONSES[disputeView]
      return (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            paddingTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}>
            {info.label}
          </p>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-text-mid)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {info.response}
          </p>
          <button
            onClick={() => setDisputeView(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 0',
              textAlign: 'left',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Back to edit
          </button>
        </div>
      )
    }

    // Default: edit fields
    return (
      <div
        onClick={e => e.stopPropagation()}
        style={{
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Merchant name input */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: '4px',
            }}>
              Merchant
            </label>
            <input
              ref={merchantInputRef}
              type="text"
              value={editMerchant}
              onChange={e => setEditMerchant(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: '2px',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          </div>

          {/* Category select */}
          <div style={{ flex: '0 1 160px' }}>
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: '4px',
            }}>
              Category
            </label>
            <select
              value={editCategory}
              onChange={e => setEditCategory(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: '2px',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Save button */}
          <button
            onClick={commitEdit}
            disabled={saving}
            style={{
              padding: '7px 18px',
              backgroundColor: 'var(--color-gold)',
              border: 'none',
              borderRadius: '2px',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Apply-to-all checkbox. Pre-checked for needs-labeling rows so a
            single correction teaches the rule engine for every sibling row. */}
        <label
          onClick={e => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={applyToMerchant}
            onChange={e => setApplyToMerchant(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--color-gold)' }}
          />
          Apply to all transactions from this merchant
        </label>

        {/* "This doesn't look right" link */}
        <button
          onClick={() => setDisputeView('menu')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '2px 0',
            textAlign: 'left',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          This doesn&apos;t look right
        </button>
      </div>
    )
  }

  return (
    <motion.div
      ref={rowRef}
      variants={rowVariants}
      whileHover={isEditing ? undefined : { backgroundColor: 'rgba(184,145,58,0.03)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleRowClick}
      style={{
        padding: isEditing ? '13px 10px 16px' : '13px 10px',
        borderBottom: '1px solid rgba(184,145,58,0.1)',
        cursor: isEditing ? 'default' : onEditRow ? 'pointer' : 'default',
        borderRadius: '1px',
        marginLeft: '-10px',
        marginRight: '-10px',
        backgroundColor: isEditing
          ? 'rgba(184,145,58,0.03)'
          : needsLabeling
            ? 'var(--color-info-bg)'
            : undefined,
        boxShadow: needsLabeling && !isEditing ? 'inset 2px 0 0 0 var(--color-info)' : undefined,
        transition: 'padding 150ms ease',
      }}
    >
      {/* Main row content: always visible */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
          {/* Line 1: merchant name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{
              fontSize: '16px',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {formatMerchant(merchantName)}
            </span>
          </div>

          {/* Line 2: metadata, middot-separated muted text */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.4,
          }}>
            <span>{formatDate(date)}</span>

            {accountLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{accountLabel}</span>
              </>
            )}

            {!isEditing && displayCategory && (
              <>
                <span aria-hidden="true">·</span>
                <span style={saving ? { color: 'var(--color-gold)' } : undefined}>
                  {saving ? 'saving...' : formatCategory(displayCategory)}
                </span>
              </>
            )}

            {pending && (
              <>
                <span aria-hidden="true">·</span>
                <span>Pending</span>
              </>
            )}

            {recurring && (
              <>
                <span aria-hidden="true">·</span>
                <span>Recurring</span>
              </>
            )}

            {tags.length > 0 && tags.map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span aria-hidden="true">·</span>
                <span
                  onClick={e => { e.stopPropagation(); openTagEditor(e) }}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Edit tag"
                >
                  {tag}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      const next = tags.filter(t => t !== tag)
                      onTagsChange?.(id, next)
                      saveTags(next)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      lineHeight: 1,
                      padding: 0,
                      display: 'inline-flex',
                      opacity: 0.6,
                    }}
                    title="Remove tag"
                  >
                    &#x2715;
                  </button>
                </span>
              </span>
            ))}

            {needsLabeling && !isEditing && (
              <>
                <span aria-hidden="true">·</span>
                <span style={{ color: 'var(--color-info)' }}>Needs labeling</span>
              </>
            )}

            {!isEditing && (
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                  ref={tagBtnRef}
                  onClick={openTagEditor}
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1,
                    opacity: hovered || tagEditorOpen ? 1 : 0,
                    transition: 'opacity 100ms ease',
                  }}
                  title="Add tag"
                >
                  +
                </button>
                {tagEditorOpen && (
                  <div
                    ref={tagEditorRef}
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 'auto',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '6px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid rgba(184,145,58,0.3)',
                      borderRadius: '2px',
                      padding: '10px',
                      width: '220px',
                      zIndex: 30,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {editingTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {editingTags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-muted)',
                              fontFamily: 'var(--font-mono)',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              border: '1px solid var(--color-border)',
                              padding: '1px 5px',
                              borderRadius: '2px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                lineHeight: 1,
                                padding: 0,
                                display: 'inline-flex',
                                opacity: 0.6,
                              }}
                            >
                              &#x2715;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      ref={tagInputRef}
                      type="text"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          addTag(tagInput)
                        } else if (e.key === 'Escape') {
                          closeTagEditor()
                        }
                      }}
                      style={{
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '2px',
                        color: 'var(--color-text)',
                        padding: '5px 8px',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </div>
                )}
              </span>
            )}
          </div>
        </div>

        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '18px',
          fontWeight: 400,
          color: isIncome ? 'var(--color-text)' : 'var(--color-negative)',
          flexShrink: 0,
          alignSelf: 'center',
        }}>
          {formatCurrency(amount)}
        </span>
      </div>

      {/* Inline edit panel, rendered inside the same container */}
      {renderEditPanel()}
    </motion.div>
  )
}
