import { colors, fonts, spacing } from '@/lib/theme'
import MobileCard from './MobileCard'

interface MobileMetricCardProps {
  label: string
  value: string
  valueColor?: string
  sub?: string
}

export default function MobileMetricCard({ label, value, valueColor, sub }: MobileMetricCardProps) {
  return (
    <MobileCard>
      <div style={{
        fontFamily: fonts.mono,
        fontSize: 10,
        color: colors.textMuted,
        letterSpacing: '0.16em',
        marginBottom: spacing.tightGap,
      }}>
        {label.toUpperCase()}
      </div>
      <div style={{
        fontFamily: fonts.sans,
        fontSize: 28,
        fontWeight: 400,
        color: valueColor ?? colors.text,
        lineHeight: 1.1,
        marginBottom: sub ? 6 : 0,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          color: colors.textMuted,
          lineHeight: 1.5,
        }}>
          {sub}
        </div>
      )}
    </MobileCard>
  )
}
