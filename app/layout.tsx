import type { Metadata } from "next"
import { Cormorant_Garamond, DM_Mono, DM_Serif_Display } from "next/font/google"
import "./globals.css"

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
})

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  title: "Illumin: Wealth Management",
  description: "Institutional personal finance",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${cormorantGaramond.variable} ${dmSerifDisplay.variable} ${dmMono.variable} antialiased`}
        style={{ backgroundColor: '#F5F0E8', color: '#1A1714', fontFamily: 'var(--font-mono), monospace' }}
      >
        {children}
      </body>
    </html>
  )
}
