import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const rules = await prisma.categoryRule.findMany({
    where: { userId: dbUser.id },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ rules })
}

export async function POST(request: NextRequest) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const body = await request.json()
  const { merchantName, category } = body

  if (!merchantName || typeof merchantName !== 'string' || !merchantName.trim()) {
    return NextResponse.json({ error: 'merchantName is required' }, { status: 400 })
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }

  const rule = await prisma.categoryRule.upsert({
    where: { userId_merchantName: { userId: dbUser.id, merchantName: body.merchantName } },
    create: { userId: dbUser.id, merchantName: body.merchantName, category: body.category },
    update: { category: body.category },
  })

  const { count: updatedTransactionCount } = await prisma.transaction.updateMany({
    where: {
      account: { userId: dbUser.id },
      merchantName: { equals: body.merchantName, mode: 'insensitive' },
    },
    data: { category: body.category },
  })

  return NextResponse.json({ rule, updatedTransactionCount })
}

export async function DELETE(request: NextRequest) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const body = await request.json()
  const { merchantName } = body

  if (!merchantName || typeof merchantName !== 'string') {
    return NextResponse.json({ error: 'merchantName is required' }, { status: 400 })
  }

  await prisma.categoryRule.delete({
    where: { userId_merchantName: { userId: dbUser.id, merchantName } },
  })

  return NextResponse.json({ success: true })
}
