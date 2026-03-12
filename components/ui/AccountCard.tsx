interface AccountCardProps {
  institutionName: string
  accountType: string
  balance: number
  last4?: string | null
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

const accountTypeLabel: Record<string, string> = {
  checking:   'Checking',
  savings:    'Savings',
  credit:     'Credit Card',
  brokerage:  'Brokerage',
  investment: 'Investment',
}

export default function AccountCard({ institutionName, accountType, balance, last4 }: AccountCardProps) {
  const isNegative = balance < 0
  const initials = institutionName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid rgba(184,145,58,0.15)',
      borderRadius: '2px',
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'border-color 150ms ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: 'rgba(184,145,58,0.08)',
          border: '1px solid rgba(184,145,58,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 500,
          color: '#B8913A',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <p style={{
            fontSize: '14px',
            color: '#1A1714',
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            marginBottom: '2px',
          }}>
            {institutionName}
          </p>
          <p style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {accountTypeLabel[accountType] ?? accountType}{last4 ? ` ···· ${last4}` : ''}
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 400,
          color: isNegative ? '#8B2635' : '#1A1714',
        }}>
          {formatCurrency(balance)}
        </p>
        <p style={{ fontSize: '10px', color: '#A89880', fontFamily: 'var(--font-mono)', marginTop: '2px', letterSpacing: '0.04em' }}>
          Current balance
        </p>
      </div>
    </div>
  )
}
