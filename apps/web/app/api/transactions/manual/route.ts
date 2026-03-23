import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user: authUser } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await request.json()
  const { merchantName, amount, type, category, date, accountId } = body

  if (!amount || isNaN(Number(amount))) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Positive = money out (expense), negative = money in (income) — Plaid convention
  const signedAmount = type === 'income' ? -Math.abs(Number(amount)) : Math.abs(Number(amount))
  const balanceDelta  = type === 'income' ?  Math.abs(Number(amount)) : -Math.abs(Number(amount))

  let resolvedAccountId: string

  if (accountId === 'cash') {
    // Find or create a Cash account for this user
    const existing = await prisma.account.findFirst({
      where: { userId: dbUser.id, institutionName: 'Cash', accountType: 'cash' },
    })
    if (existing) {
      resolvedAccountId = existing.id
    } else {
      const cash = await prisma.account.create({
        data: {
          userId:          dbUser.id,
          institutionName: 'Cash',
          accountType:     'cash',
          balance:         0,
          classification:  'asset',
        },
      })
      resolvedAccountId = cash.id
    }
  } else {
    // Verify the account belongs to this user
    const acct = await prisma.account.findFirst({
      where: { id: accountId, userId: dbUser.id },
    })
    if (!acct) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    resolvedAccountId = acct.id
  }

  // Create the transaction
  const transaction = await prisma.transaction.create({
    data: {
      accountId:    resolvedAccountId,
      merchantName: merchantName || 'Manual entry',
      amount:       signedAmount,
      category:     category || null,
      date:         new Date(date || Date.now()),
      pending:      false,
    },
  })

  // Update account balance
  await prisma.account.update({
    where: { id: resolvedAccountId },
    data:  { balance: { increment: balanceDelta } },
  })

  return NextResponse.json({ transaction })
}
