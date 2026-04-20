'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from 'react'

const ONE_SECOND = 1000

export const STALE_TIMES = {
  default: 60 * ONE_SECOND,
  short: 30 * ONE_SECOND,
  medium: 2 * 60 * ONE_SECOND,
  long: 5 * 60 * ONE_SECOND,
  veryLong: 30 * 60 * ONE_SECOND,
} as const

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.default,
        gcTime: 5 * 60 * ONE_SECOND,
        refetchOnWindowFocus: false,
        refetchOnMount: 'always',
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient())
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV !== 'production' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
