import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Illumin',
  description: 'How Illumin collects, uses, and protects your personal information.',
}

const sections = [
  {
    number: '1',
    title: 'Introduction',
    content: [
      'Illumin ("Illumin," "we," "our," or "us") operates the Illumin personal finance and wealth management application, accessible at illuminwealth.com (the "Service"). This Privacy Policy describes how we collect, use, and protect information about you when you use our Service.',
      'By creating an account or using the Service, you agree to the collection and use of your information as described in this Privacy Policy. If you do not agree, do not use the Service.',
    ],
  },
  {
    number: '2',
    title: 'Information We Collect',
    subsections: [
      {
        title: '2.1 Information You Provide Directly',
        content: 'When you create an account and complete onboarding, we collect:',
        list: [
          'Email address',
          'Age',
          'Annual income',
          'Savings rate',
          'Planned retirement age',
          'Name (optional, provided at signup)',
        ],
      },
      {
        title: '2.2 Financial Data via Plaid',
        content: 'If you choose to connect your financial accounts, we use Plaid Technologies, Inc. ("Plaid") to access your financial account data. When you connect an account through Plaid Link, Plaid collects your financial institution credentials and returns account and transaction data to us. This data may include account balances, transaction history, and account identifiers. Your use of Plaid is subject to Plaid\'s own Privacy Policy, available at plaid.com/legal.',
      },
      {
        title: '2.3 Information Collected Automatically',
        content: 'When you use the Service, we may automatically collect:',
        list: [
          'Authentication session data (via Supabase, our authentication provider)',
          'Basic usage data necessary to operate the Service',
        ],
      },
    ],
  },
  {
    number: '3',
    title: 'How We Use Your Information',
    content: ['We use the information we collect solely to provide and improve the Service. Specifically:'],
    list: [
      'To create and manage your account',
      'To calculate personalized financial projections and opportunity cost estimates',
      'To connect and display your linked financial accounts',
      'To send authentication codes and security-related communications',
      'To comply with applicable legal obligations',
    ],
    footer: [
      'We do not use your information for advertising. We do not sell your information to third parties. We do not use your information to train machine learning models.',
    ],
  },
  {
    number: '4',
    title: 'How We Share Your Information',
    content: [
      'We do not sell, rent, or share your personal information with third parties for their own marketing or commercial purposes. We share your information only in the following limited circumstances:',
    ],
    list: [
      'With Plaid, to facilitate the connection of your financial accounts, subject to your explicit consent at the time of connection',
      'With Supabase, our database and authentication infrastructure provider, which stores your data on our behalf',
      'With Vercel, our hosting provider, which processes requests to the Service on our behalf',
      'As required by law, regulation, or valid legal process',
      'To protect the rights, property, or safety of Illumin or its users',
    ],
    footer: [
      'Supabase and Vercel are engaged as data processors and are contractually obligated to protect your data in accordance with applicable privacy law.',
    ],
  },
  {
    number: '5',
    title: 'Data Retention and Deletion',
    content: [
      'We retain your personal information for as long as your account is active or as needed to provide the Service. If you request deletion of your account:',
    ],
    list: [
      'Your personal data will be deleted from our production database within 30 days of your request',
      'Residual copies in backups will be deleted or overwritten within 90 days',
    ],
    footer: ['To request account deletion, contact us at jared.a.lederman@gmail.com.'],
  },
  {
    number: '6',
    title: 'Data Security',
    content: ['We take the security of your data seriously. Our security practices include:'],
    list: [
      'All data transmitted between your device and our servers is encrypted using TLS 1.2 or higher',
      'All data stored in our database is encrypted at rest using AES-256 via Supabase',
      'Multi-factor authentication is required for all users before accessing financial data',
      'Access to production systems is limited to authorized personnel only',
    ],
    footer: [
      'No method of transmission over the internet or method of electronic storage is 100% secure. While we implement commercially reasonable measures to protect your information, we cannot guarantee absolute security.',
    ],
  },
  {
    number: '7',
    title: 'Your Rights',
    content: [
      'Depending on your location, you may have the following rights with respect to your personal information:',
    ],
    list: [
      'The right to access the personal information we hold about you',
      'The right to correct inaccurate or incomplete information',
      'The right to request deletion of your personal information',
      'The right to withdraw consent for data processing where consent is the legal basis',
      'The right to data portability',
    ],
    footer: [
      'To exercise any of these rights, contact us at jared.a.lederman@gmail.com. We will respond to verified requests within 30 days.',
    ],
  },
  {
    number: '8',
    title: "Children's Privacy",
    content: [
      'The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that a child under 16 has provided us with personal information, we will delete it promptly. If you believe a child under 16 has provided us with their information, contact us at jared.a.lederman@gmail.com.',
    ],
  },
  {
    number: '9',
    title: 'California Privacy Rights (CCPA)',
    content: [
      'If you are a California resident, you have the following additional rights under the California Consumer Privacy Act (CCPA):',
    ],
    list: [
      'The right to know what personal information we collect, use, disclose, and sell',
      'The right to delete your personal information',
      'The right to opt out of the sale of your personal information (note that Illumin does not sell personal information)',
      'The right to non-discrimination for exercising your privacy rights',
    ],
    footer: ['To exercise your California privacy rights, contact us at jared.a.lederman@gmail.com.'],
  },
  {
    number: '10',
    title: 'Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by posting a notice in the Service prior to the change becoming effective. Your continued use of the Service after the effective date of the updated policy constitutes your acceptance of the changes.',
      'We encourage you to review this Privacy Policy periodically.',
    ],
  },
  {
    number: '11',
    title: 'Contact Us',
    content: ['If you have questions or concerns about this Privacy Policy or our data practices, contact us at:'],
    contact: true,
  },
]

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
    }}>
      {/* Nav bar */}
      <header style={{
        borderBottom: '1px solid var(--color-border)',
        padding: '0 48px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            fontWeight: 400,
            color: 'var(--color-gold)',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
          }}>
            Illumin
          </span>
        </Link>
        <Link href="/auth/login" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
          letterSpacing: '0.08em',
        }}>
          Sign in
        </Link>
      </header>

      {/* Content */}
      <main className="privacy-container" style={{
      }}>
        {/* Page header */}
        <div style={{ marginBottom: '64px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            Legal
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '42px',
            fontWeight: 300,
            color: 'var(--color-text)',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            marginBottom: '16px',
          }}>
            Privacy Policy
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.04em',
          }}>
            Effective Date: March 20, 2026
          </p>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          backgroundColor: 'var(--color-border)',
          marginBottom: '64px',
        }} />

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
          {sections.map((section) => (
            <section key={section.number}>
              {/* Section heading */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '20px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-gold)',
                  letterSpacing: '0.14em',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  {section.number.padStart(2, '0')}
                </span>
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '22px',
                  fontWeight: 300,
                  color: 'var(--color-text)',
                  lineHeight: 1.2,
                  margin: 0,
                }}>
                  {section.title}
                </h2>
              </div>

              {/* Body paragraphs */}
              {'content' in section && section.content && (section.content as string[]).map((para, i) => (
                <p key={i} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--color-text-mid)',
                  lineHeight: 1.75,
                  letterSpacing: '0.02em',
                  marginBottom: '14px',
                }}>
                  {para}
                </p>
              ))}

              {/* List items */}
              {'list' in section && section.list && (
                <ul style={{ margin: '8px 0 14px', padding: 0, listStyle: 'none' }}>
                  {(section.list as string[]).map((item, i) => (
                    <li key={i} style={{
                      display: 'flex',
                      gap: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      color: 'var(--color-text-mid)',
                      lineHeight: 1.75,
                      letterSpacing: '0.02em',
                      marginBottom: '6px',
                    }}>
                      <span style={{ color: 'var(--color-gold)', flexShrink: 0, marginTop: '1px' }}>—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {/* Footer paragraphs */}
              {'footer' in section && section.footer && (section.footer as string[]).map((para, i) => (
                <p key={i} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--color-text-mid)',
                  lineHeight: 1.75,
                  letterSpacing: '0.02em',
                  marginTop: '14px',
                }}>
                  {para}
                </p>
              ))}

              {/* Subsections */}
              {'subsections' in section && section.subsections && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '8px' }}>
                  {section.subsections.map((sub) => (
                    <div key={sub.title}>
                      <p style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        marginBottom: '10px',
                      }}>
                        {sub.title}
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        color: 'var(--color-text-mid)',
                        lineHeight: 1.75,
                        letterSpacing: '0.02em',
                        marginBottom: sub.list ? '10px' : 0,
                      }}>
                        {sub.content}
                      </p>
                      {sub.list && (
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {sub.list.map((item, i) => (
                            <li key={i} style={{
                              display: 'flex',
                              gap: '12px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                              color: 'var(--color-text-mid)',
                              lineHeight: 1.75,
                              letterSpacing: '0.02em',
                              marginBottom: '6px',
                            }}>
                              <span style={{ color: 'var(--color-gold)', flexShrink: 0, marginTop: '1px' }}>—</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Contact block */}
              {'contact' in section && section.contact && (
                <div style={{
                  marginTop: '16px',
                  padding: '20px 24px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '16px',
                    fontWeight: 300,
                    color: 'var(--color-text)',
                    marginBottom: '10px',
                  }}>
                    Illumin
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.8,
                    letterSpacing: '0.02em',
                    margin: 0,
                  }}>
                    Email: jared.a.lederman@gmail.com<br />
                    Website: illuminwealth.com
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer rule */}
        <div style={{
          height: '1px',
          backgroundColor: 'var(--color-border)',
          marginTop: '80px',
          marginBottom: '32px',
        }} />
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.04em',
        }}>
          &copy; 2026 Illumin. All rights reserved.
        </p>
      </main>
    </div>
  )
}
