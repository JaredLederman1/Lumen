import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/sovereign'
  const adapter = new PrismaPg({ connectionString })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any)
}

// Force fresh client so schema changes are picked up
globalForPrisma.prisma = undefined

export const prisma = createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
