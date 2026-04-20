-- One-time sanitization of Transaction.merchantName to match the runtime
-- cleanup applied at Plaid ingestion. Strips trailing "*//" / "//" tokens,
-- leading / trailing asterisks, collapses whitespace, and trims.
UPDATE "Transaction"
SET "merchantName" = NULLIF(
  BTRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE("merchantName", '\s*\*?/{2,}\s*$', '', 'g'),
          '^\*+', '', 'g'
        ),
        '\*+$', '', 'g'
      ),
      '\s+', ' ', 'g'
    )
  ),
  ''
)
WHERE "merchantName" IS NOT NULL
  AND (
    "merchantName" ~ '\*?/{2,}\s*$'
    OR "merchantName" ~ '^\*'
    OR "merchantName" ~ '\*$'
    OR "merchantName" ~ '\s{2,}'
    OR "merchantName" ~ '^\s'
    OR "merchantName" ~ '\s$'
  );
