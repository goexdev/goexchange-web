import { describe, it, expect } from 'vitest'
import { formatQuoteScaled, formatBaseScaled } from '../scale'

// 1 USDT = 1_000_000 in the persisted (scaled) form.
// 1 BNB  = 1_000_000_000_000_000_000 in the persisted (scaled) form.
// These helpers strip the scale so the admin sees the human number.

describe('formatQuoteScaled (1e6 scale, USDT-style)', () => {
  it('whole number', () => {
    expect(formatQuoteScaled('105000000')).toBe('105')
  })

  it('fractional', () => {
    expect(formatQuoteScaled('14970000')).toBe('14.97')
  })

  it('zero', () => {
    expect(formatQuoteScaled('0')).toBe('0')
  })

  it('large value', () => {
    // 1,000,000.123456 USDT -> 1000000123456
    expect(formatQuoteScaled('1000000123456')).toBe('1000000.123456')
  })

  it('empty string -> em-dash', () => {
    expect(formatQuoteScaled('')).toBe('—')
  })

  it('undefined -> em-dash', () => {
    expect(formatQuoteScaled(undefined)).toBe('—')
  })

  it('null -> em-dash', () => {
    expect(formatQuoteScaled(null)).toBe('—')
  })

  it('garbage falls back to raw value (defensive)', () => {
    expect(formatQuoteScaled('not-a-number')).toBe('not-a-number')
  })
})

describe('formatBaseScaled (1e18 scale, wei-style)', () => {
  it('whole number', () => {
    expect(formatBaseScaled('1000000000000000000')).toBe('1')
  })

  it('fractional (BNB precision)', () => {
    // 0.0021 BNB = 2_100_000_000_000_000 wei
    expect(formatBaseScaled('2100000000000000')).toBe('0.0021')
  })

  it('zero', () => {
    expect(formatBaseScaled('0')).toBe('0')
  })

  it('small fractional', () => {
    // 0.0003 BNB = 300_000_000_000_000 wei
    expect(formatBaseScaled('300000000000000')).toBe('0.0003')
  })

  it('empty string -> em-dash', () => {
    expect(formatBaseScaled('')).toBe('—')
  })
})
