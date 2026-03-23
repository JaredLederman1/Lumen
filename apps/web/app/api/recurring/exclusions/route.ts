import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

async function getDbUser(request: NextRequest) {
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

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
  return dbUser
}

// GET: return all excluded merchant names for the current user
export async function GET(request: NextRequest) {
  try {
    const dbUser = await getDbUser(request)
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const exclusions = await prisma.recurringExclusion.findMany({
      where: { userId: dbUser.id },
      select: { merchantName: true },
    })

    return NextResponse.json({
      excluded: exclusions.map(e => e.merchantName),
    })
  } catch (error) {
    console.error('[recurring/exclusions GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: mark a merchant as non-recurring
export async function POST(request: NextRequest) {
  try {
    const dbUser = await getDbUser(request)
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { merchantName } = await request.json()
    if (!merchantName || typeof merchantName !== 'string') {
      return NextResponse.json({ error: 'merchantName is required' }, { status: 400 })
    }

    await prisma.recurringExclusion.upsert({
      where: {
        userId_merchantName: { userId: dbUser.id, merchantName: merchantName.trim() },
      },
      create: { userId: dbUser.id, merchantName: merchantName.trim() },
      update: {},
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[recurring/exclusions POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: re-mark a merchant as recurring (undo exclusion)
export async function DELETE(request: NextRequest) {
  try {
    const dbUser = await getDbUser(request)
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { merchantName } = await request.json()
    if (!merchantName || typeof merchantName !== 'string') {
      return NextResponse.json({ error: 'merchantName is required' }, { status: 400 })
    }

    await prisma.recurringExclusion.deleteMany({
      where: { userId: dbUser.id, merchantName: merchantName.trim() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[recurring/exclusions DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
