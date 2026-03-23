import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

async function getUser(request: NextRequest) {
  // Try Bearer token first (profile page edit form)
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

  // Fall back to session cookies (onboarding page)
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
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.onboardingProfile.findUnique({
      where: { userId: user.id },
    })
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[onboarding GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { age, annualIncome, savingsRate, retirementAge } = body

    if (
      typeof age !== 'number' ||
      typeof annualIncome !== 'number' ||
      typeof savingsRate !== 'number' ||
      typeof retirementAge !== 'number'
    ) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.user.upsert({
      where: { email: user.email! },
      update: {},
      create: { id: user.id, email: user.email! },
    })

    const profile = await prisma.onboardingProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, age, annualIncome, savingsRate, retirementAge },
      update: { age, annualIncome, savingsRate, retirementAge },
    })

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('[onboarding POST]', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
