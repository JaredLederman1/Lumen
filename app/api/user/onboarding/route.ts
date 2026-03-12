import { NextRequest, NextResponse } from 'next/server'

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

    // Best-effort log — DB save can be added once OnboardingProfile model is migrated
    console.log('[Onboarding] Profile received:', { age, annualIncome, savingsRate, retirementAge })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
