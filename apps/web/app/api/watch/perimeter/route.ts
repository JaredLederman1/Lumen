/**
 * GET /api/watch/perimeter — feeds PerimeterSVG. Returns the user's active
 * Signal rows plus their liquid cash position. Always scoped to the
 * authenticated user; userId never comes from the client.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPerimeterResponse } from '@/lib/vigilance/perimeterDerivation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const data = await getPerimeterResponse(prisma, auth.user.dbUser.id)

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
