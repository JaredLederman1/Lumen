import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { crossCheckBenefits, calcTotals } from '@/lib/benefitsAnalysis'
import type { ExtractedBenefits } from '@/lib/benefitsAnalysis'

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ benefits: null })

    const benefits = await prisma.employmentBenefits.findUnique({ where: { userId: dbUser.id } })
    if (!benefits) return NextResponse.json({ benefits: null })

    const extracted = benefits.rawExtraction as unknown as ExtractedBenefits
    const crossCheck = crossCheckBenefits(extracted)
    const { totalContractValue, totalBenefitsValue } = calcTotals(extracted)
    const actionItemsDone = (benefits.actionItemsDone as string[]) ?? []

    return NextResponse.json({ benefits, extracted, crossCheck, totalContractValue, totalBenefitsValue, actionItemsDone })
  } catch (error) {
    console.error('[benefits GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
