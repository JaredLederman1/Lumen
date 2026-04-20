import type { Metadata } from "next"
import { Cormorant_Garamond, DM_Mono, DM_Serif_Display, Geist } from "next/font/google"
import "./globals.css"
import { ReactQueryProvider } from "@/lib/queryClient"

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-display",
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geist.variable} ${cormorantGaramond.variable} ${dmSerifDisplay.variable} ${dmMono.variable} antialiased`}
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans), sans-serif' }}
      >
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  )
}
