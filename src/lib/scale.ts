// Formatting helpers for the admin mmbot page.
//
// The mmbot engine (goexchange-core) persists scaled values in
// numeric(38,0) columns to avoid floating-point drift:
//   quote_balance / price / pnl_quote use scale 1e6 (USDT-style)
//   base_balance / qty            use scale 1e18 (wei-style)
//
// The page surfaces these to admins. The string round-trips
// losslessly through shopspring/decimal. We import the JS
// port of the same library so a future feature like
// "filter by pnl_quote < -100" can use the same primitives.
//
// We DO NOT round or trim trailing zeros; the admin should see
// the exact value the matching engine stored. Trailing zeros
// (e.g. "105.000000") are fine — they signal the precision.

import Decimal from 'decimal.js'

const QUOTE_SCALE = new Decimal('1000000')
const BASE_SCALE = new Decimal('1000000000000000000')

/**
 * Convert a scaled integer string (1e6 scale) to a human-scale
 * decimal string. `105000000` -> `"105"`, `14970000` -> `"14.97"`.
 * Returns the original string on parse error rather than
 * rendering NaN, so a corrupt row in the DB doesn't break
 * the admin page.
 */
export function formatQuoteScaled(s: string | undefined | null): string {
  if (!s) return '—'
  try {
    return new Decimal(s).div(QUOTE_SCALE).toString()
  } catch {
    return s
  }
}

/** Same as formatQuoteScaled but for the 1e18 wei-style base asset. */
export function formatBaseScaled(s: string | undefined | null): string {
  if (!s) return '—'
  try {
    return new Decimal(s).div(BASE_SCALE).toString()
  } catch {
    return s
  }
}
