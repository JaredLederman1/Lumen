import { NextRequest, NextResponse } from 'next/server'
import { getAkoyaAuthUrl } from '@/lib/akoya'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const connectorId = searchParams.get('connectorId') ?? 'schwab'

  console.log('[Akoya connect] incoming params:', {
    connectorId,
    allParams: Object.fromEntries(searchParams.entries()),
  })
  console.log('[Akoya connect] env check:', {
    AKOYA_CLIENT_ID: process.env.AKOYA_CLIENT_ID ? `${process.env.AKOYA_CLIENT_ID.slice(0, 8)}…` : 'MISSING',
    AKOYA_CLIENT_SECRET: process.env.AKOYA_CLIENT_SECRET ? 'set' : 'MISSING',
    AKOYA_REDIRECT_URI: process.env.AKOYA_REDIRECT_URI ?? 'MISSING',
  })

  if (!process.env.AKOYA_CLIENT_ID || !process.env.AKOYA_CLIENT_SECRET || !process.env.AKOYA_REDIRECT_URI) {
    console.error('[Akoya connect] Missing required env vars; check .env.local and restart the dev server')
    return NextResponse.redirect(new URL('/dashboard/accounts?error=not_configured', request.url))
  }

  try {
    const authUrl = getAkoyaAuthUrl(connectorId)
    console.log('[Akoya connect] redirecting to:', authUrl)
    return NextResponse.redirect(authUrl)
  } catch (err) {
    console.error('[Akoya connect] failed to build auth URL:', err)
    return NextResponse.redirect(new URL('/dashboard/accounts?error=build_failed', request.url))
  }
}
