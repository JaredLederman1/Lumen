import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { label, done }: { label: string; done: boolean } = await request.json()

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const benefits = await prisma.employmentBenefits.findUnique({ where: { userId: dbUser.id } })
    if (!benefits) return NextResponse.json({ error: 'No benefits record found' }, { status: 404 })

    const current = (benefits.actionItemsDone as string[]) ?? []
    const updated = done
      ? Array.from(new Set([...current, label]))
      : current.filter((l: string) => l !== label)

    const result = await prisma.employmentBenefits.update({
      where: { userId: dbUser.id },
      data:  { actionItemsDone: updated },
    })

    return NextResponse.json({ actionItemsDone: result.actionItemsDone })
  } catch (error) {
    console.error('[benefits/actions PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
