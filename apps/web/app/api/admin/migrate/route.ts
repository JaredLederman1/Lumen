import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Dev-only diagnostic route. Returns a snapshot of all users and accounts
 * so orphaned or mis-scoped rows can be identified and reassigned manually
 * via Prisma Studio before data-scoping enforcement goes live.
 *
 * Protected by a secret header: x-migrate-secret must match MIGRATE_SECRET.
 * Never automates destructive DB writes.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-migrate-secret')
  if (secret !== process.env.MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [allUsers, allAccounts] = await Promise.all([
    prisma.user.findMany(),
    prisma.account.findMany({ include: { user: true } }),
  ])

  return NextResponse.json({
    userCount: allUsers.length,
    users: allUsers.map(u => ({ id: u.id, email: u.email })),
    accountCount: allAccounts.length,
    accounts: allAccounts.map(a => ({
      id: a.id,
      institutionName: a.institutionName,
      userId: a.userId,
      userEmail: a.user?.email ?? 'NO USER',
    })),
  })
}
