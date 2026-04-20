// Plaid merchant names frequently arrive with artifact tokens ("FOO*//",
// "//CHECKCARD FOO"), leading or trailing asterisks, and runs of whitespace
// that look ugly in the UI. This helper cleans the display-facing string
// before it is persisted. The raw Plaid payload is not touched.
export function sanitizeMerchantName(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null
  let value = String(raw)

  // Strip trailing "*//" and "//" patterns.
  value = value.replace(/\s*\*?\/{2,}\s*$/g, '')

  // Strip leading and trailing asterisks.
  value = value.replace(/^\*+/, '')
  value = value.replace(/\*+$/, '')

  // Collapse runs of whitespace to a single space.
  value = value.replace(/\s+/g, ' ')

  // Trim surrounding whitespace.
  value = value.trim()

  return value.length > 0 ? value : null
}
