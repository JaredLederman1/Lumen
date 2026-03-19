import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
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

  // Verify the transaction belongs to this user
  const tx = await prisma.transaction.findFirst({
    where: { id, account: { userId: dbUser.id } },
  })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  const body = await request.json()
  const { category } = body

  const updated = await prisma.transaction.update({
    where: { id },
    data: { category: category ?? null },
  })

  return NextResponse.json({ transaction: updated })
}
