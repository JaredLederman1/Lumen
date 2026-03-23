'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import ChecklistItem from '@/components/ui/ChecklistItem'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ChecklistState = {
  msgId: string
  items: string[]
  promptStatus: 'idle' | 'saving' | 'saved' | 'error'
  savedCount: number
  fadingOut: boolean
  hidden: boolean
}

function parseContent(text: string): { prose: string; items: string[] } {
  const lines = text.split('\n')
  const items: string[] = []
  const proseLines: string[] = []
  for (const line of lines) {
    const m = line.match(/^\d+\.\s+(.+)/)
    if (m) {
      items.push(m[1].trim())
    } else {
      proseLines.push(line)
    }
  }
  return { prose: proseLines.join('\n').trim(), items }
}

function BlinkingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      style={{ color: 'var(--color-gold)', marginLeft: 1, fontWeight: 300 }}
    >
      |
    </motion.span>
  )
}

function StreamingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 20 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--color-gold)', display: 'inline-block',
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function CoachWidget() {
  const [isOpen, setIsOpen]         = useState(false)
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [checklistState, setChecklistState] = useState<ChecklistState | null>(null)

  const containerRef    = useRef<HTMLDivElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)
  const userHasScrolled = useRef(false)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    userHasScrolled.current = !atBottom
  }, [])

  // Auto-scroll on new messages only when already at bottom
  useEffect(() => {
    if (userHasScrolled.current) return
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Your complete financial picture is loaded. What would you like to analyze?',
      }])
      setHasGreeted(true)
    }
  }, [isOpen, hasGreeted])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')

    const userMsg: Message      = { id: Date.now().toString(),       role: 'user',      content: text }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setChecklistState(null)
    setIsStreaming(true)

    // Scroll to bottom when user sends
    userHasScrolled.current = false
    requestAnimationFrame(() => {
      const el = containerRef.current
      if (el) el.scrollTop = el.scrollHeight
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const firstUserIdx = messages.findIndex(m => m.role === 'user')
      const apiHistory   = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : []
      const apiMessages  = [...apiHistory, userMsg].map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status}: ${errText}`)
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let finalContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        finalContent += chunk
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: finalContent }
          return next
        })
      }

      setIsStreaming(false)

      // Detect checklist items only after stream completes
      const { items } = parseContent(finalContent)
      if (items.length > 0) {
        setChecklistState({
          msgId: assistantMsg.id,
          items,
          promptStatus: 'idle',
          savedCount: 0,
          fadingOut: false,
          hidden: false,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[CoachWidget]', msg)
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${msg}` }
        return next
      })
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages])

  const saveChecklist = useCallback(async () => {
    if (!checklistState || checklistState.promptStatus !== 'idle') return
    setChecklistState(s => s ? { ...s, promptStatus: 'saving' } : null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: checklistState.items }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      const saved = data.created ?? checklistState.items.length

      setChecklistState(s => s ? { ...s, promptStatus: 'saved', savedCount: saved } : null)
      setTimeout(() => {
        setChecklistState(s => s ? { ...s, fadingOut: true } : null)
      }, 4000)
    } catch {
      setChecklistState(s => s ? { ...s, promptStatus: 'error' } : null)
    }
  }, [checklistState])

  const dismissChecklist = useCallback(() => {
    setChecklistState(null)
  }, [])

  const toggleCheckedItem = useCallback((key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const explainItem = useCallback(async (itemText: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

    const response = await fetch('/api/coach', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          { role: 'user', content: `In one sentence, explain how to actually do this or where to learn more: "${itemText}"` },
        ],
      }),
    })
    if (!response.ok || !response.body) throw new Error('Failed')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
    }
    return result.trim()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--color-gold)', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.transform  = 'scale(1.06)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(0,0,0,0.5)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.transform  = 'scale(1)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'
        }}
        aria-label={isOpen ? 'Close Illumin Engine' : 'Open Illumin Engine'}
      >
        {isOpen ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 12M14 2L2 14" stroke="var(--color-surface)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 20l4.3-1.4C8.5 19.2 9.7 19.5 11 19.5c4.97 0 9-3.8 9-9S15.97 2 11 2z" fill="var(--color-surface)" stroke="none" />
            <circle cx="8"  cy="10.5" r="1.2" fill="var(--color-gold)" />
            <circle cx="11" cy="10.5" r="1.2" fill="var(--color-gold)" />
            <circle cx="14" cy="10.5" r="1.2" fill="var(--color-gold)" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed', bottom: 92, right: 28, zIndex: 999,
              width: 360, maxHeight: 520,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-gold-border)',
              borderRadius: 4,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--color-text)' }}>
                  Illumin Engine
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                  Financial analysis engine
                </div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-positive)' }} />
            </div>

            {/* Disclaimer */}
            <div style={{
              padding: '8px 18px',
              borderBottom: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
              flexShrink: 0,
            }}>
              For informational purposes only. Not financial advice. Does not recommend buying or selling specific securities. Past performance does not guarantee future results.
            </div>

            {/* Message list */}
            <div
              ref={containerRef}
              onScroll={handleScroll}
              style={{
                flex: 1, overflowY: 'auto', padding: '16px 18px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              {messages.map((msg, idx) => {
                const isLastMsg       = idx === messages.length - 1
                const isStreamingThis = isLastMsg && isStreaming
                const isEmpty         = msg.content === ''

                if (msg.role === 'user') {
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: 'flex-end',
                        maxWidth: '80%',
                        marginLeft: 'auto',
                        background: 'var(--color-gold-subtle)',
                        border: '1px solid var(--color-gold-border)',
                        borderRadius: '12px 12px 2px 12px',
                        padding: '10px 14px',
                        fontFamily: 'var(--font-mono)', fontSize: 13,
                        color: 'var(--color-text)', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>
                  )
                }

                // Assistant message
                const { prose, items } = parseContent(msg.content)
                const showItems   = items.length > 0 && !isStreamingThis
                const showPrompt  = checklistState?.msgId === msg.id && !isStreaming && !checklistState.hidden

                return (
                  <div key={msg.id}>
                    <div style={{
                      alignSelf: 'flex-start',
                      maxWidth: '85%',
                      marginRight: 'auto',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: '2px 12px 12px 12px',
                      padding: '10px 14px',
                      fontFamily: 'var(--font-mono)', fontSize: 13,
                      color: 'var(--color-text)', lineHeight: 1.6,
                    }}>
                      {isStreamingThis && isEmpty ? (
                        <StreamingDots />
                      ) : isStreamingThis ? (
                        // During streaming: raw text + blinking cursor
                        <span style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}<BlinkingCursor />
                        </span>
                      ) : (
                        // After streaming: prose + ChecklistItem rows
                        <>
                          {prose && (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{prose}</span>
                          )}
                          {showItems && (
                            <div style={{ marginTop: prose ? 12 : 0 }}>
                              {items.map((item, i) => (
                                <ChecklistItem
                                  key={i}
                                  text={item}
                                  checked={checkedItems.has(`${msg.id}-${i}`)}
                                  onChange={() => toggleCheckedItem(`${msg.id}-${i}`)}
                                  onExplain={explainItem}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Save to checklist prompt */}
                    {showPrompt && checklistState && (
                      <div
                        style={{
                          marginTop: 8,
                          opacity: checklistState.fadingOut ? 0 : 1,
                          transition: 'opacity 600ms ease',
                        }}
                        onTransitionEnd={() => {
                          if (checklistState.fadingOut) {
                            setChecklistState(s => s ? { ...s, hidden: true } : null)
                          }
                        }}
                      >
                        {checklistState.promptStatus === 'idle' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                              Save these recommendations to your checklist?
                            </span>
                            <button
                              onClick={saveChecklist}
                              style={{
                                padding: '4px 12px',
                                background: 'var(--color-gold)',
                                border: 'none', borderRadius: 3,
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                color: 'var(--color-surface)',
                                letterSpacing: '0.04em', cursor: 'pointer',
                              }}
                            >
                              Save to checklist
                            </button>
                            <button
                              onClick={dismissChecklist}
                              style={{
                                padding: '4px 8px',
                                background: 'none',
                                border: '1px solid var(--color-border)', borderRadius: 3,
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                color: 'var(--color-text-muted)', cursor: 'pointer',
                              }}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {checklistState.promptStatus === 'saving' && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                            Saving...
                          </span>
                        )}
                        {checklistState.promptStatus === 'saved' && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-positive)' }}>
                            {checklistState.savedCount} recommendation{checklistState.savedCount !== 1 ? 's' : ''} saved
                          </span>
                        )}
                        {checklistState.promptStatus === 'error' && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-negative)' }}>
                            Could not save. Try again.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Input area */}
            <div style={{
              borderTop: '1px solid var(--color-border)',
              padding: '12px 14px',
              display: 'flex', gap: 8, alignItems: 'flex-end',
              flexShrink: 0,
            }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                rows={1}
                style={{
                  flex: 1, minHeight: 36, maxHeight: 100, resize: 'none',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6, padding: '8px 12px',
                  fontFamily: 'var(--font-mono)', fontSize: 13,
                  color: 'var(--color-text)', lineHeight: 1.5, outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-gold)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              />
              <button
                onClick={sendMessage}
                disabled={isStreaming || input.trim() === ''}
                style={{
                  width: 34, height: 34, flexShrink: 0,
                  background: 'var(--color-gold)', border: 'none', borderRadius: 6,
                  cursor: isStreaming || input.trim() === '' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: isStreaming || input.trim() === '' ? 0.5 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1l6 6-6 6M1 7h12" stroke="var(--color-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
