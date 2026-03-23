import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { prisma } from '@/lib/prisma'
import { crossCheckBenefits, calcTotals } from '@/lib/benefitsAnalysis'
import type { ExtractedBenefits } from '@/lib/benefitsAnalysis'
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimit'

export type { ExtractedBenefits } from '@/lib/benefitsAnalysis'
export type { BenefitStatus }     from '@/lib/benefitsAnalysis'


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
  "rsuGrantValue": number | null,
  "rsuTotalShares": number | null,
  "rsuVestYears": number | null,
  "rsuCliffYears": number | null,
  "hasStockOptions": boolean,
  "stockOptionShares": number | null,
  "stockOptionStrikePrice": number | null,
  "stockOptionVestYears": number | null,
  "stockOptionCliffYears": number | null,
  "stockOptionType": "ISO" | "NSO" | null,
  "hasESPP": boolean,
  "esppDiscount": number | null,
  "hasCommuterBenefits": boolean,
  "commuterMonthlyLimit": number | null,
  "tuitionReimbursement": number | null,
  "wellnessStipend": number | null,
  "homeOfficeStipend": number | null,
  "professionalDevBudget": number | null,
  "ptoDays": number | null,
  "paidSickLeaveDays": number | null,
  "paidSickLeaveUnlimited": boolean,
  "hasSeverance": boolean,
  "severanceMonths": number | null,
  "hasLifeInsurance": boolean,
  "hasSTDLTD": boolean
}

Rules:
- matchRate: fraction, e.g. 0.5 for "50% match"
- matchCap: fraction of salary, e.g. 0.06 for "up to 6% of salary"
- annualBonusTargetPct: fraction, e.g. 0.15 for "15% bonus target"
- Stock options: set hasStockOptions=true whenever stock options, ISOs, NSOs, incentive stock options, or non-qualified stock options are mentioned. Extract share count, strike/exercise price, vest schedule, and type (ISO or NSO). Stock options are DISTINCT from RSUs — do not conflate them.
- RSUs: set hasRSUs=true whenever RSUs, restricted stock units, or equity grants are mentioned. Set rsuGrantValue to the total dollar value if stated (e.g. "$200,000 in RSUs" -> 200000). Set rsuTotalShares only if a share count is explicitly given. Always extract BOTH if both are mentioned.
- paidSickLeaveDays: number of sick days if a specific count is mentioned. Set paidSickLeaveUnlimited=true if the policy is described as unlimited.
- Use null for numbers not mentioned, false for booleans not mentioned`

function err(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status })
}

export async function POST(request: NextRequest) {
  const limitKey = await getRateLimitKey(request)
  const limit = rateLimiter('ai', limitKey)
  if (!limit.allowed) return limit.response

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return err('Missing or invalid authorization header', 'AUTH_MISSING', 401)
  }
  const token = authHeader.slice(7)

  let userId: string
  let userEmail: string
  try {
    const { createClient } = await import('@supabase/supabase-js')
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[benefits/extract] Supabase env vars missing')
      return err('Server misconfiguration: Supabase not configured', 'CONFIG_SUPABASE', 500)
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user?.email) {
      return err('Invalid or expired session. Please sign in again.', 'AUTH_INVALID', 401)
    }
    userId    = user.id
    userEmail = user.email
  } catch (e) {
    console.error('[benefits/extract] Auth check failed:', e)
    return err('Authentication service unavailable', 'AUTH_ERROR', 503)
  }

  // ── File validation ──────────────────────────────────────────────────────────
  let fileBuffer: Buffer
  try {
    const formData = await request.formData()
    const file = formData.get('contract')
    if (!file || !(file instanceof Blob)) {
      return err('No file uploaded. Attach a PDF as "contract".', 'FILE_MISSING', 400)
    }
    if (file.type !== 'application/pdf') {
      return err(`File type "${file.type}" is not supported. Please upload a PDF.`, 'FILE_TYPE', 400)
    }
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return err('File too large. Maximum size is 10MB.', 'FILE_TOO_LARGE', 413)
    }
    if (file.size < 100) {
      return err('File appears to be empty or corrupt.', 'FILE_EMPTY', 400)
    }
    fileBuffer = Buffer.from(await file.arrayBuffer())
  } catch (e) {
    console.error('[benefits/extract] File read failed:', e)
    return err('Failed to read uploaded file', 'FILE_READ_ERROR', 400)
  }

  // ── Claude extraction (PDF sent natively — no pdf-parse dependency) ──────────
  let extracted: ExtractedBenefits
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'document',
            source: { type: 'base64', media_type: 'application/pdf', data: fileBuffer.toString('base64') },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      } as MessageParam],
    })

    const rawText  = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    if (!jsonText) {
      console.error('[benefits/extract] Claude returned empty response')
      return err('AI returned an empty response. Try again.', 'AI_EMPTY_RESPONSE', 502)
    }

    try {
      extracted = JSON.parse(jsonText)
    } catch (parseErr) {
      console.error('[benefits/extract] JSON parse failed. Raw:', jsonText.slice(0, 200), parseErr)
      return err('AI response could not be parsed. The document may not be a standard offer letter.', 'AI_PARSE_ERROR', 422)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[benefits/extract] Claude API error:', msg)
    if (msg.includes('401') || msg.includes('auth'))    return err('AI service authentication failed. Check ANTHROPIC_API_KEY.', 'AI_AUTH', 502)
    if (msg.includes('429') || msg.includes('rate'))    return err('AI service rate limit hit. Please wait a moment and try again.', 'AI_RATE_LIMIT', 429)
    if (msg.includes('timeout') || msg.includes('ECONNRESET')) return err('AI service timed out. Try again.', 'AI_TIMEOUT', 504)
    return err(`AI service error: ${msg}`, 'AI_ERROR', 502)
  }

  // ── Cross-check & totals ─────────────────────────────────────────────────────
  const crossCheck          = crossCheckBenefits(extracted)
  const { totalContractValue, totalBenefitsValue } = calcTotals(extracted)
  const capturedAnnualValue = crossCheck
    .filter(s => s.captured === true && s.annualValue)
    .reduce((sum, s) => sum + (s.annualValue ?? 0), 0)

  // ── Database ─────────────────────────────────────────────────────────────────
  try {
    const dbUser = await prisma.user.upsert({
      where:  { email: userEmail },
      update: {},
      create: { id: userId, email: userEmail },
    })

    const benefitFields = {
      extractedAt:          new Date(),
      rawExtraction:        extracted as object,
      has401k:              Boolean(extracted.has401k),
      matchRate:            extracted.matchRate            ?? null,
      matchCap:             extracted.matchCap             ?? null,
      vestingYears:         extracted.vestingYears         ?? null,
      hasHSA:               Boolean(extracted.hasHSA),
      hsaEmployerContrib:   extracted.hsaEmployerContrib   ?? null,
      hasFSA:               Boolean(extracted.hasFSA),
      fsaLimit:             extracted.fsaLimit             ?? null,
      hasRSUs:              Boolean(extracted.hasRSUs),
      rsuGrantValue:        extracted.rsuGrantValue        ?? null,
      stockOptionShares:    extracted.stockOptionShares    ?? null,
      paidSickLeaveDays:    extracted.paidSickLeaveDays    ?? null,
      hasESPP:              Boolean(extracted.hasESPP),
      esppDiscount:         extracted.esppDiscount         ?? null,
      hasCommuterBenefits:  Boolean(extracted.hasCommuterBenefits),
      commuterMonthlyLimit: extracted.commuterMonthlyLimit ?? null,
      tuitionReimbursement: extracted.tuitionReimbursement ?? null,
      wellnessStipend:      extracted.wellnessStipend      ?? null,
      totalAnnualValue:     totalBenefitsValue,
      capturedAnnualValue,
      actionItemsDone:      [],
    }

    const benefits = await prisma.employmentBenefits.upsert({
      where:  { userId: dbUser.id },
      update: benefitFields,
      create: { userId: dbUser.id, ...benefitFields },
    })

    return NextResponse.json({ benefits, extracted, crossCheck, totalContractValue, totalBenefitsValue, capturedAnnualValue })
  } catch (e) {
    console.error('[benefits/extract] DB error:', e)
    return err('Failed to save results to database. Your analysis completed successfully but could not be stored.', 'DB_ERROR', 500)
  }
}
