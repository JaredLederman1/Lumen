import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACTION_PROMPT = `You are an expert at extracting employment benefits information from HR documents and offer letters.

Extract the following information from the provided employment document and return ONLY valid JSON with no markdown fences or extra text:

{
  "has401k": boolean,
  "matchRate": number | null,        // e.g. 1.0 for 100% match, 0.5 for 50% match
  "matchCap": number | null,         // fraction of salary, e.g. 0.06 for 6%
  "vestingYears": number | null,
  "hasHSA": boolean,
  "hsaEmployerContrib": number | null,  // annual dollar amount
  "hasFSA": boolean,
  "fsaLimit": number | null,            // annual dollar limit
  "hasRSUs": boolean,
  "hasESPP": boolean,
  "esppDiscount": number | null,        // e.g. 0.15 for 15%
  "hasCommuterBenefits": boolean,
  "commuterMonthlyLimit": number | null, // monthly dollar limit
  "tuitionReimbursement": number | null, // annual dollar amount
  "wellnessStipend": number | null       // annual dollar amount
}

Document text:
`

export async function POST(request: NextRequest) {
  try {
    // Auth via Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    // Validate token with Supabase
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

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const pdfData = await pdfParse(buffer)
    const pdfText = pdfData.text?.trim()
    if (!pdfText) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 422 })
    }

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: EXTRACTION_PROMPT + pdfText.slice(0, 60000) },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extracted: any
    try {
      extracted = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: 'Failed to parse extraction response' }, { status: 422 })
    }

    // Calculate total annual value estimate
    const annualIncome = 150000 // default estimate; will be refined with onboarding data
    const matchAnnual = extracted.has401k
      ? annualIncome * (extracted.matchCap ?? 0) * (extracted.matchRate ?? 0)
      : 0
    const hsaAnnual  = extracted.hsaEmployerContrib ?? 0
    const esppAnnual = extracted.hasESPP ? 5000 * (extracted.esppDiscount ?? 0) : 0
    const commuterAnnual = extracted.hasCommuterBenefits
      ? (extracted.commuterMonthlyLimit ?? 0) * 12 * 0.25
      : 0
    const tuitionAnnual  = extracted.tuitionReimbursement ?? 0
    const wellnessAnnual = extracted.wellnessStipend ?? 0
    const totalAnnualValue = Math.round(
      matchAnnual + hsaAnnual + esppAnnual + commuterAnnual + tuitionAnnual + wellnessAnnual
    )

    // Upsert into DB
    const benefits = await prisma.employmentBenefits.upsert({
      where:  { userId: user.id },
      update: {
        extractedAt:          new Date(),
        rawExtraction:        extracted,
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
        totalAnnualValue,
        capturedAnnualValue:  0,
      },
      create: {
        userId:               user.id,
        rawExtraction:        extracted,
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
        totalAnnualValue,
        capturedAnnualValue:  0,
      },
    })

    return NextResponse.json({ benefits })
  } catch (error) {
    console.error('[benefits/extract]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
