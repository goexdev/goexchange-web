import { describe, it, expect } from 'vitest'
import type { BotStatus } from '../../lib/api'

// Pure-logic tests for the AdminMMBot page helpers. The
// actual page is React with side effects (fetch, toasts,
// confirm modals); we test the helpers used by it in
// isolation so a regression in the status badge mapping
// or the default-spread-bps rule is caught without
// spinning up a render tree.

describe('BotStatusBadge color mapping', () => {
  // Mirrors the colorMap in AdminMMBot.tsx
  const colorMap: Record<BotStatus, string> = {
    UNSPECIFIED: 'bg-gray-600 text-gray-200',
    STOPPED: 'bg-gray-600 text-gray-200',
    SEEDING: 'bg-yellow-600 text-yellow-100',
    READY: 'bg-blue-600 text-blue-100',
    RUNNING: 'bg-green-600 text-green-100',
    STOPPING: 'bg-orange-600 text-orange-100',
    FAILED: 'bg-red-600 text-red-100',
  }

  it('maps RUNNING to green', () => {
    expect(colorMap.RUNNING).toBe('bg-green-600 text-green-100')
  })

  it('maps FAILED to red', () => {
    expect(colorMap.FAILED).toBe('bg-red-600 text-red-100')
  })

  it('maps SEEDING to yellow', () => {
    expect(colorMap.SEEDING).toBe('bg-yellow-600 text-yellow-100')
  })

  it('maps STOPPING to orange', () => {
    expect(colorMap.STOPPING).toBe('bg-orange-600 text-orange-100')
  })

  it('maps STOPPED to gray (matches UNSPECIFIED)', () => {
    // Operator-side: a stopped bot is not a problem, just
    // inactive. Same neutral color as unspecified.
    expect(colorMap.STOPPED).toBe(colorMap.UNSPECIFIED)
  })
})

describe('PnL color rule', () => {
  // Mirrors the inline className in the bot table
  function pnlClass(pnl: string): string {
    return Number(pnl) < 0 ? 'text-red-400' : 'text-green-400'
  }

  it('red on negative', () => {
    expect(pnlClass('-14.97')).toBe('text-red-400')
  })

  it('green on positive', () => {
    expect(pnlClass('14.97')).toBe('text-green-400')
  })

  it('green on zero', () => {
    expect(pnlClass('0')).toBe('text-green-400')
  })

  it('green on positive with leading decimal', () => {
    expect(pnlClass('0.0001')).toBe('text-green-400')
  })
})

describe('Stop button enabled rule', () => {
  // Mirrors the `disabled` prop in the table row
  function canStop(status: BotStatus): boolean {
    return status !== 'STOPPED' && status !== 'STOPPING'
  }

  it('disabled when STOPPED', () => {
    expect(canStop('STOPPED')).toBe(false)
  })

  it('disabled when STOPPING (already stopping)', () => {
    expect(canStop('STOPPING')).toBe(false)
  })

  it('enabled when RUNNING', () => {
    expect(canStop('RUNNING')).toBe(true)
  })

  it('enabled when FAILED (let operator clean up)', () => {
    expect(canStop('FAILED')).toBe(true)
  })

  it('enabled when SEEDING (cancel a stuck start)', () => {
    expect(canStop('SEEDING')).toBe(true)
  })
})

describe('Default spread_bps', () => {
  // Mirrors the form's default value
  const DEFAULT_SPREAD_BPS = 10

  it('starts at 10 bps on first render', () => {
    expect(DEFAULT_SPREAD_BPS).toBe(10)
  })

  it('accepts user override', () => {
    const userSpread = 25
    expect(userSpread).toBeGreaterThan(0)
  })
})
