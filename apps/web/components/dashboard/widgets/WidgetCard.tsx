'use client'

import { CSSProperties, ReactNode } from 'react'

/**
 * WidgetCard is the shared shell for every card in the dashboard grid.
 *
 * The `variant` prop decides slot structure:
 *   metric  - eyebrow, optional caption(s) + hero number(s), fixed-height
 *             secondary region, bottom-aligned CTA.
 *   list    - eyebrow, list rows (children), bottom-aligned CTA. No serif
 *             sub-heading between the eyebrow and the rows.
 *   chart   - eyebrow, DM Mono caption, chart (children), optional CTA. No
 *             serif sub-heading.
 *
 * The hero number uses one canonical size (HERO_FONT_SIZE) across every
 * metric card on the page so the dashboard reads as one system. The secondary
 * slot in a metric card uses `flex: 1`, which means all metric cards placed
 * in the same grid row share the same secondary-slot height (grid rows
 * equalise card heights, the secondary slot absorbs the difference).
 */

const CANONICAL_HERO_FONT_SIZE = '56px'
const SECONDARY_SLOT_MIN_HEIGHT = '96px'

interface BaseProps {
  eyebrow: ReactNode
  cta?: ReactNode
  accent?: 'neutral' | 'alert' | 'positive'
  style?: CSSProperties
}

export interface MetricColumn {
  caption?: string
  hero: ReactNode
  heroColor?: string
  // Default 'above' preserves the original layout for every card that does
  // not opt in. 'below' renders the caption as a quiet sentence-case
  // footnote under the hero number instead of an uppercase eyebrow-style
  // label above it.
  captionPosition?: 'above' | 'below'
}

interface MetricVariantProps extends BaseProps {
  variant: 'metric'
  columns: MetricColumn[]
  secondary?: ReactNode
  secondaryFill?: boolean
}

interface ListVariantProps extends BaseProps {
  variant: 'list'
  children?: ReactNode
}

interface ChartVariantProps extends BaseProps {
  variant: 'chart'
  caption: string
  children?: ReactNode
}

type Props = MetricVariantProps | ListVariantProps | ChartVariantProps

const shell: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-section-below)',
  height: '100%',
}

// Footnote-style caption that sits below the hero. One step smaller than
// the eyebrow, sentence case, normal letter-spacing. Reads as a quiet
// annotation of the hero rather than a second header competing with the
// eyebrow label above.
const captionBelowStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  fontWeight: 400,
  color: 'var(--color-text-muted)',
  letterSpacing: 'normal',
  margin: 0,
}

const heroStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: CANONICAL_HERO_FONT_SIZE,
  fontWeight: 400,
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1,
  margin: 0,
}

const accentBorder: Record<NonNullable<BaseProps['accent']>, CSSProperties> = {
  neutral: {},
  alert: { borderColor: 'var(--color-negative-border)' },
  positive: { borderColor: 'var(--color-positive-border)' },
}

const secondarySlot: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: SECONDARY_SLOT_MIN_HEIGHT,
}

const ctaRow: CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  alignItems: 'flex-end',
}

function Eyebrow({ text }: { text: ReactNode }) {
  return <p className="ui-label">{text}</p>
}

function HeroColumn({ col }: { col: MetricColumn }) {
  const position = col.captionPosition ?? 'above'
  const hero = (
    <div
      style={{
        ...heroStyle,
        color: col.heroColor ?? heroStyle.color,
      }}
    >
      {col.hero}
    </div>
  )

  if (position === 'below') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-value-to-subtext)',
          minWidth: 0,
        }}
      >
        {hero}
        {col.caption && <p style={captionBelowStyle}>{col.caption}</p>}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-label-to-value)',
        minWidth: 0,
      }}
    >
      {col.caption && <p className="ui-label">{col.caption}</p>}
      {hero}
    </div>
  )
}

export default function WidgetCard(props: Props) {
  const { eyebrow, cta, accent = 'neutral', style } = props

  const shellStyle = { ...shell, ...accentBorder[accent], ...style }

  if (props.variant === 'metric') {
    return (
      <div className="card-hoverable" style={shellStyle}>
        <Eyebrow text={eyebrow} />
        <div
          style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          {props.columns.map((col, i) => (
            <HeroColumn key={i} col={col} />
          ))}
        </div>
        <div style={secondarySlot}>{props.secondary ?? null}</div>
        {cta && <div style={ctaRow}>{cta}</div>}
      </div>
    )
  }

  if (props.variant === 'list') {
    return (
      <div className="card-hoverable" style={shellStyle}>
        <Eyebrow text={eyebrow} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {props.children}
        </div>
        {cta && <div style={ctaRow}>{cta}</div>}
      </div>
    )
  }

  return (
    <div className="card-hoverable" style={shellStyle}>
      <Eyebrow text={eyebrow} />
      <p className="ui-label">{props.caption}</p>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {props.children}
      </div>
      {cta && <div style={ctaRow}>{cta}</div>}
    </div>
  )
}

export { CANONICAL_HERO_FONT_SIZE, SECONDARY_SLOT_MIN_HEIGHT }
