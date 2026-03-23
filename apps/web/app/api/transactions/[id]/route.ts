import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const result = await requireAuth()
    if ('error' in result) return result.error
    const { user: { dbUser } } = result

    // Verify the transaction belongs to this user
    const tx = await prisma.transaction.findFirst({
      where: { id, account: { userId: dbUser.id } },
    })
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const body = await request.json()
    const { category, merchantName, applyToMerchant } = body

    const data: { category?: string | null; merchantName?: string | null } = {}
    if (category !== undefined) data.category = category ?? null
    if (merchantName !== undefined) data.merchantName = merchantName ?? null

    const updated = await prisma.transaction.update({
      where: { id },
      data,
    })

    let ruleCreated = false
    let updatedCount = 0
    let renameCount = 0

    // Bulk-rename all transactions with the same original merchant name
    // and create a rename rule for future Plaid syncs
    if (merchantName !== undefined && tx.merchantName) {
      const originalName = tx.merchantName

      const { count } = await prisma.transaction.updateMany({
        where: {
          account: { userId: dbUser.id },
          merchantName: { equals: originalName, mode: 'insensitive' },
          id: { not: id },
        },
        data: { merchantName },
      })
      renameCount = count

      await prisma.merchantRenameRule.upsert({
        where: { userId_originalName: { userId: dbUser.id, originalName } },
        create: { userId: dbUser.id, originalName, renamedTo: merchantName },
        update: { renamedTo: merchantName },
      })
    }

    if (applyToMerchant && category && tx.merchantName) {
      await prisma.categoryRule.upsert({
        where: { userId_merchantName: { userId: dbUser.id, merchantName: tx.merchantName } },
        create: { userId: dbUser.id, merchantName: tx.merchantName, category },
        update: { category },
      })

      const { count } = await prisma.transaction.updateMany({
        where: {
          account: { userId: dbUser.id },
          merchantName: { equals: tx.merchantName, mode: 'insensitive' },
        },
        data: { category },
      })

      ruleCreated = true
      updatedCount = count
    }

    return NextResponse.json({ transaction: updated, ruleCreated, updatedCount, renameCount })
  } catch (err) {
    console.error('[PATCH /api/transactions/[id]] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
