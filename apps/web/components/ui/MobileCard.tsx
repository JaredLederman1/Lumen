import { colors, spacing, radius } from '@/lib/theme'

interface MobileCardProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export default function MobileCard({ children, style }: MobileCardProps) {
  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.goldBorder}`,
      borderRadius: radius.card,
      padding: spacing.cardPad,
      ...style,
    }}>
      {children}
    </div>
  )
}
