/**
 * Scheduler logic for the vigilance cron. Determines which users are due for
 * a scan and runs them with a bounded concurrency + per-user timeout.
 *
 * `runScanForUser` is invoked in-process (no HTTP hop to /api/internal/scan)
 * because both the cron handler and the scheduler share the same Next.js
 * server runtime; skipping the round-trip is faster and avoids re-auth.
 */

/**
 * Scan scheduling notes:
 *
 * Current cadence: once daily at 11:30 UTC (7:30am EST) via Vercel Cron.
 * This is a Vercel Hobby plan constraint, Hobby allows one cron fire per day.
 *
 * DEFERRED (post-launch premium feature):
 *   - Per-user timezone staggering: users' scans should fire at their local
 *     early-morning time (e.g., 4-6am local) so morning-check users get fresh
 *     data on wake. Requires persisting timezone on User model.
 *   - Multi-scan cadence (4x/day): once Vercel Pro is acquired or scheduling
 *     is moved off Vercel Cron, premium tier users can get continuous vigilance.
 *     Free tier stays once-daily.
 *
 * See Pricing domain in Notion for the strategic framing.
 */

import * as Sentry from '@sentry/nextjs'
import type { PrismaClient } from '@prisma/client'
import { runScanForUser, serializeError } from '@/lib/vigilance/scanRunner'

export async function getUsersDueForScan(
  prisma: PrismaClient,
  options: { maxAgeHours: number },
): Promise<string[]> {
  const cutoff = new Date(Date.now() - options.maxAgeHours * 60 * 60 * 1000)

  const candidates = await prisma.user.findMany({
    where: {
      accounts: {
        some: { plaidAccessToken: { not: null } },
      },
    },
    select: {
      id: true,
      scans: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { completedAt: true },
      },
    },
  })

  const due: string[] = []
  for (const user of candidates) {
    const latest = user.scans[0]
    if (!latest) {
      due.push(user.id)
      continue
    }
    if (latest.completedAt === null || latest.completedAt < cutoff) {
      due.push(user.id)
    }
  }
  return due
}

export interface ScheduledScansResult {
  succeeded: number
  failed: number
  errors: Array<{ userId: string; error: string }>
}

const MAX_ERRORS_STORED = 50
const MAX_ERROR_LENGTH = 500

export async function runScheduledScans(
  userIds: string[],
  options: { concurrency: number; perUserTimeoutMs: number },
): Promise<ScheduledScansResult> {
  const result: ScheduledScansResult = {
    succeeded: 0,
    failed: 0,
    errors: [],
  }

  if (userIds.length === 0) return result

  const queue = userIds.slice()
  const concurrency = Math.max(1, Math.min(options.concurrency, userIds.length))

  Sentry.addBreadcrumb({
    category: 'scheduler',
    message: 'batch_started',
    level: 'info',
    data: { userCount: userIds.length, concurrency, perUserTimeoutMs: options.perUserTimeoutMs },
  })

  async function runOne(userId: string): Promise<void> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () =>
          reject(
            new Error(`Scan timed out after ${options.perUserTimeoutMs}ms`),
          ),
        options.perUserTimeoutMs,
      )
    })
    try {
      await Promise.race([runScanForUser(userId, 'scheduled'), timeoutPromise])
      result.succeeded++
    } catch (err) {
      result.failed++
      Sentry.captureException(err, {
        tags: {
          component: 'scan_scheduler',
          userId,
        },
      })
      if (result.errors.length < MAX_ERRORS_STORED) {
        result.errors.push({
          userId,
          error: serializeError(err).slice(0, MAX_ERROR_LENGTH),
        })
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift()
      if (!next) break
      await runOne(next)
    }
  }

  const workers: Promise<void>[] = []
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker())
  }
  await Promise.all(workers)

  Sentry.addBreadcrumb({
    category: 'scheduler',
    message: 'batch_completed',
    level: result.failed > 0 ? 'warning' : 'info',
    data: {
      userCount: userIds.length,
      succeeded: result.succeeded,
      failed: result.failed,
    },
  })

  return result
}
