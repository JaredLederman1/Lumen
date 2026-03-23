import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

const SYSTEM_PROMPT = `You are a financial analyst writing a brief portfolio summary for a client. Write exactly 2-3 sentences in plain English with no jargon. Do not use em dashes. Summarize overall performance, what drove it, and one specific risk or opportunity worth noting.

UNIT CONSISTENCY RULE - this is non-negotiable: never compare a dollar amount to a percentage in the same sentence or clause. If comparing two values they must be in the same unit. Good: "Your portfolio gained 7.1% while the market gained 6.2%." Good: "Your gain of $12,140 compares to a market-equivalent gain of $10,690 on the same starting value." Bad: "You made $12,140 while the market returned 6.2%." - this is a unit error and must never appear.`

interface SummaryInput {
  portfolioReturn: number
  benchmarkReturn: number
  bestTicker: string
  bestReturn: number
  worstTicker: string
  worstReturn: number
  holdingsCount: number
  top3: Array<{ ticker: string; weight: number; return: number }>
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth()
    if ('error' in authResult) return authResult.error

    const body: SummaryInput = await request.json()

    const pct = (n: number) => `${(n * 100).toFixed(1)}%`

    const userContent = `Portfolio data (all values are percentages, no dollar amounts):
- Total portfolio return (1 year): ${pct(body.portfolioReturn)}
- S&P 500 benchmark return (same period): ${pct(body.benchmarkReturn)}
- Best performer: ${body.bestTicker} at ${pct(body.bestReturn)}
- Worst performer: ${body.worstTicker} at ${pct(body.worstReturn)}
- Number of holdings: ${body.holdingsCount}
- Top 3 holdings by weight: ${body.top3.map((h) => `${h.ticker} (${pct(h.weight)} weight, ${pct(h.return)} return)`).join(', ')}

Write a 2-3 sentence summary as described.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 256,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userContent }],
          })

          for await (const chunk of aiStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'delta', text: chunk.delta.text }) + '\n',
                ),
              )
            }
          }

          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                error: err instanceof Error ? err.message : 'Stream failed',
              }) + '\n',
            ),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[/api/ai/portfolio-summary]', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
