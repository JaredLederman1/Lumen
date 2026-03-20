import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
    if (user) return user
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) return NextResponse.json({ budget: null })

    const budget = await prisma.budget.findUnique({ where: { userId: dbUser.id } })
    return NextResponse.json({ budget })
  } catch (err) {
    console.error('[budget GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await request.json()
    const { strategy, monthlyIncome, categories } = body

    const budget = await prisma.budget.upsert({
      where: { userId: dbUser.id },
      create: { userId: dbUser.id, strategy, monthlyIncome, categories },
      update: { strategy, monthlyIncome, categories },
    })

    return NextResponse.json({ budget })
  } catch (err) {
    console.error('[budget POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
