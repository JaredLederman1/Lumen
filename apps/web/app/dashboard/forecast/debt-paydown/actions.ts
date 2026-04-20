'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface UpdateAprResult {
  ok: boolean
  apr?: number | null
  aprConfirmedAt?: string | null
  error?: string
}

/**
 * Updates the APR on a single debt account. APR may be supplied as a decimal
 * fraction (0.24) or as a percentage (24). Anything greater than 1 is treated
 * as a percentage and divided by 100. Pass null to clear the APR and fall back
 * to the page-level 24 percent default.
 */
export async function updateAccountApr(
  accountId: string,
  apr: number | null,
): Promise<UpdateAprResult> {
  const auth = await requireAuth()
  if ('error' in auth) {
    return { ok: false, error: 'Unauthorized' }
  }
  const { user: { dbUser } } = auth

  const existing = await prisma.account.findUnique({ where: { id: accountId } })
  if (!existing || existing.userId !== dbUser.id) {
    return { ok: false, error: 'Not found' }
  }

  let normalized: number | null = null
  if (apr !== null) {
    if (typeof apr !== 'number' || !Number.isFinite(apr) || apr < 0) {
      return { ok: false, error: 'Invalid APR' }
    }
    normalized = apr > 1 ? apr / 100 : apr
  }

  const now = new Date()
  const updated = await prisma.account.update({
    where: { id: accountId },
    data: {
      apr: normalized,
      aprConfirmedAt: normalized === null ? null : now,
    },
  })

  revalidatePath('/dashboard/forecast/debt-paydown')

  return {
    ok: true,
    apr: updated.apr,
    aprConfirmedAt: updated.aprConfirmedAt ? updated.aprConfirmedAt.toISOString() : null,
  }
}
