/**
 * Visual constants for mobile components.
 * CSS variable strings are used in web context.
 * When migrating to React Native, replace the var() strings
 * with their resolved hex values from globals.css.
 */

export const colors = {
  // Backgrounds
  bg:             'var(--color-bg)',
  surface:        'var(--color-surface)',
  surfaceAlt:     'rgba(255,255,255,0.03)',

  // Text
  text:           'var(--color-text)',
  textMuted:      'var(--color-text-muted)',
  textMid:        'var(--color-text-mid)',

  // Semantic
  positive:       'var(--color-positive)',
  positiveBg:     'var(--color-positive-bg)',
  positiveBorder: 'var(--color-positive-border)',
  negative:       'var(--color-negative)',
  negativeBg:     'var(--color-negative-bg)',
  negativeBorder: 'var(--color-negative-border)',
  gold:           'var(--color-gold)',
  goldSubtle:     'var(--color-gold-subtle)',
  goldBorder:     'var(--color-gold-border)',
  info:           'var(--color-info)',
  infoBg:         'var(--color-info-bg)',
  infoBorder:     'var(--color-info-border)',

  // Structure
  border:         'var(--color-border)',
  borderStrong:   'var(--color-border-strong)',
  gridLine:       'var(--color-grid-line)',
} as const

export const fonts = {
  mono:   'var(--font-mono)',
  serif:  'var(--font-serif)',
  sans:   'var(--font-sans)',
} as const

export const spacing = {
  tapTarget:   44,   // minimum touch target height
  pagePad:     20,   // horizontal page padding
  cardPad:     20,   // card internal padding
  sectionGap:  16,   // gap between stacked sections
  rowGap:      12,   // gap between list rows
  tightGap:    8,    // tight internal spacing
} as const

export const radius = {
  card:   2,
  badge:  2,
  button: 2,
} as const

/**
 * Reusable style objects for mobile components.
 * These mirror the desktop card/label patterns but use theme constants.
 */

export const mobileCard = {
  backgroundColor: colors.surface,
  borderWidth:     1,
  borderStyle:     'solid' as const,
  borderColor:     colors.goldBorder,
  borderRadius:    radius.card,
  padding:         spacing.cardPad,
} as const

export const mobileLabelText = {
  fontFamily:    fonts.mono,
  fontSize:      11,
  color:         colors.textMuted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
} as const

export const mobileBodyText = {
  fontFamily: fonts.mono,
  fontSize:   13,
  color:      colors.textMuted,
  lineHeight: 1.7,
} as const

export const mobileValueText = {
  fontFamily: fonts.sans,
  fontSize:   28,
  fontWeight: 400 as const,
  color:      colors.text,
} as const

export const mobileHeadingText = {
  fontFamily: fonts.serif,
  fontSize:   22,
  fontWeight: 400 as const,
  color:      colors.text,
} as const
