import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { crossCheckBenefits, calcTotals } from '@/lib/benefitsAnalysis'
import type { ExtractedBenefits } from '@/lib/benefitsAnalysis'

export type { ExtractedBenefits } from '@/lib/benefitsAnalysis'
export type { BenefitStatus }     from '@/lib/benefitsAnalysis'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACTION_PROMPT = `You are an expert at extracting employment compensation and benefits from offer letters and HR documents.

Extract ALL of the following from the provided document and return ONLY valid JSON with no markdown fences or extra text:

{
  "baseSalary": number | null,
  "annualBonusTargetPct": number | null,
  "signingBonus": number | null,
  "has401k": boolean,
  "matchRate": number | null,
  "matchCap": number | null,
  "vestingYears": number | null,
  "hasHSA": boolean,
  "hsaEmployerContrib": number | null,
  "hasFSA": boolean,
  "fsaLimit": number | null,
  "hasRSUs": boolean,
  "rsuTotalShares": number | null,
  "rsuVestYears": number | null,
  "rsuCliffYears": number | null,
  "hasESPP": boolean,
  "esppDiscount": number | null,
  "hasCommuterBenefits": boolean,
  "commuterMonthlyLimit": number | null,
  "tuitionReimbursement": number | null,
  "wellnessStipend": number | null,
  "homeOfficeStipend": number | null,
  "professionalDevBudget": number | null,
  "ptoDays": number | null,
  "hasSeverance": boolean,
  "severanceMonths": number | null,
  "hasLifeInsurance": boolean,
  "hasSTDLTD": boolean
}

Rules:
- matchRate: fraction, e.g. 0.5 for "50% match"
- matchCap: fraction of salary, e.g. 0.06 for "up to 6% of salary"
- annualBonusTargetPct: fraction, e.g. 0.15 for "15% bonus target"
- Use null for numbers not mentioned, false for booleans not mentioned

Document text:
`

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('contract')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 20MB limit' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const pdfData = await parser.getText()
    await parser.destroy()
    const pdfText = pdfData.text?.trim()
    if (!pdfText) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 422 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT + pdfText.slice(0, 60000) }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let extracted: ExtractedBenefits
    try {
      extracted = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: 'Failed to parse extraction response' }, { status: 422 })
    }

    const crossCheck = crossCheckBenefits(extracted)
    const { totalContractValue, totalBenefitsValue } = calcTotals(extracted)
    const capturedAnnualValue = crossCheck
      .filter(s => s.captured === true && s.annualValue)
      .reduce((sum, s) => sum + (s.annualValue ?? 0), 0)

    const dbUser = await prisma.user.upsert({
      where:  { email: user.email! },
      update: {},
      create: { id: user.id, email: user.email! },
    })

    const benefits = await prisma.employmentBenefits.upsert({
      where:  { userId: dbUser.id },
      update: {
        extractedAt:          new Date(),
        rawExtraction:        extracted as object,
        has401k:              Boolean(extracted.has401k),
        matchRate:            extracted.matchRate ?? null,
        matchCap:             extracted.matchCap ?? null,
        vestingYears:         extracted.vestingYears ?? null,
        hasHSA:               Boolean(extracted.hasHSA),
        hsaEmployerContrib:   extracted.hsaEmployerContrib ?? null,
        hasFSA:               Boolean(extracted.hasFSA),
        fsaLimit:             extracted.fsaLimit ?? null,
        hasRSUs:              Boolean(extracted.hasRSUs),
        hasESPP:              Boolean(extracted.hasESPP),
        esppDiscount:         extracted.esppDiscount ?? null,
        hasCommuterBenefits:  Boolean(extracted.hasCommuterBenefits),
        commuterMonthlyLimit: extracted.commuterMonthlyLimit ?? null,
        tuitionReimbursement: extracted.tuitionReimbursement ?? null,
        wellnessStipend:      extracted.wellnessStipend ?? null,
        totalAnnualValue:     totalBenefitsValue,
        capturedAnnualValue,
        actionItemsDone:      [],
      },
      create: {
        userId:               dbUser.id,
        rawExtraction:        extracted as object,
        has401k:              Boolean(extracted.has401k),
        matchRate:            extracted.matchRate ?? null,
        matchCap:             extracted.matchCap ?? null,
        vestingYears:         extracted.vestingYears ?? null,
        hasHSA:               Boolean(extracted.hasHSA),
        hsaEmployerContrib:   extracted.hsaEmployerContrib ?? null,
        hasFSA:               Boolean(extracted.hasFSA),
        fsaLimit:             extracted.fsaLimit ?? null,
        hasRSUs:              Boolean(extracted.hasRSUs),
        hasESPP:              Boolean(extracted.hasESPP),
        esppDiscount:         extracted.esppDiscount ?? null,
        hasCommuterBenefits:  Boolean(extracted.hasCommuterBenefits),
        commuterMonthlyLimit: extracted.commuterMonthlyLimit ?? null,
        tuitionReimbursement: extracted.tuitionReimbursement ?? null,
        wellnessStipend:      extracted.wellnessStipend ?? null,
        totalAnnualValue:     totalBenefitsValue,
        capturedAnnualValue,
        actionItemsDone:      [],
      },
    })

    return NextResponse.json({ benefits, extracted, crossCheck, totalContractValue, totalBenefitsValue, capturedAnnualValue })
  } catch (error) {
    console.error('[benefits/extract]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
