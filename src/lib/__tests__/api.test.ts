import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetAllMocks()
})

function mockResponse(data: any) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify(data),
    json: async () => data,
  }
}

describe('Trigger API', () => {
  it('listTriggers returns triggers', async () => {
    const mockData = {
      triggers: [
        {
          id: '1',
          pair: 'BTC_USDT',
          side: 'SELL',
          trigger_type: 'STOP_LOSS',
          status: 'PENDING',
        },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(mockData)))

    const { listTriggers } = await import('../api')
    const result = await listTriggers()
    expect(result.triggers).toHaveLength(1)
    expect(result.triggers[0].trigger_type).toBe('STOP_LOSS')
  })

  it('cancelTrigger returns status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ status: 'cancelled' })))

    const { cancelTrigger } = await import('../api')
    const result = await cancelTrigger('test-id')
    expect(result.status).toBe('cancelled')
  })
})

describe('Address API', () => {
  it('listAddresses returns addresses', async () => {
    const mockData = {
      addresses: [
        { id: '1', asset: 'BTC', address: 'bc1q...', label: 'Test', whitelisted: false },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(mockData)))

    const { listAddresses } = await import('../api')
    const result = await listAddresses()
    expect(result.addresses).toHaveLength(1)
  })

  it('addAddress sends POST', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          id: '1',
          asset: 'BTC',
          address: 'bc1q...',
          label: 'Test',
          whitelisted: false,
        })
      )
    )

    const { addAddress } = await import('../api')
    const result = await addAddress('BTC', 'bc1q...', 'Test', false)
    expect(result.id).toBe('1')
  })
})

describe('MMBot API', () => {
  it('adminStartBot posts to /admin/mmbot/start and unwraps { bot: ... }', async () => {
    const mockData = {
      bot: {
        bot_id: 'BNB_USDT_mm_1',
        pair: 'BNB_USDT',
        status: 'RUNNING',
        mid_price: '50000',
        spread_bps: 20,
        base_balance: '2400000000000000',
        quote_balance: '90030000',
        open_orders: ['order-1', 'order-2'],
        pnl_quote: '-14970000',
        created_at: '2026-09-05T05:00:00Z',
        started_at: '2026-09-05T05:00:00Z',
        stopped_at: null,
        last_error: '',
      },
    }
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(mockData))
    vi.stubGlobal('fetch', fetchMock)

    const { adminStartBot } = await import('../api')
    const result = await adminStartBot({
      pair: 'BNB_USDT',
      mid_price: '50000',
      quote_seed: '100',
      base_seed: '0.002',
      spread_bps: 20,
    })
    expect(result.bot_id).toBe('BNB_USDT_mm_1')
    expect(result.status).toBe('RUNNING')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/mmbot/start'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('adminStopBot posts return_inventory=true by default', async () => {
    const mockData = {
      bot: {
        bot_id: 'BNB_USDT_mm_1',
        pair: 'BNB_USDT',
        status: 'STOPPED',
        mid_price: '50000',
        spread_bps: 20,
        base_balance: '0',
        quote_balance: '0',
        open_orders: [],
        pnl_quote: '-14970000',
        created_at: '2026-09-05T05:00:00Z',
        started_at: '2026-09-05T05:00:00Z',
        stopped_at: '2026-09-05T05:01:00Z',
        last_error: '',
      },
      returned_quote: '90.03',
      returned_base: '0.0024',
    }
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(mockData))
    vi.stubGlobal('fetch', fetchMock)

    const { adminStopBot } = await import('../api')
    const result = await adminStopBot('BNB_USDT_mm_1', true)
    expect(result.bot.status).toBe('STOPPED')
    expect(result.returned_quote).toBe('90.03')
    expect(result.returned_base).toBe('0.0024')
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body)
    expect(body.return_inventory).toBe(true)
  })

  it('adminListBots unwraps { bots: [...] }', async () => {
    const mockData = {
      bots: [
        {
          bot_id: 'BNB_USDT_mm_1',
          pair: 'BNB_USDT',
          status: 'RUNNING',
          mid_price: '50000',
          spread_bps: 20,
          base_balance: '0',
          quote_balance: '0',
          open_orders: [],
          pnl_quote: '0',
          created_at: '',
          started_at: null,
          stopped_at: null,
          last_error: '',
        },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(mockData)))

    const { adminListBots } = await import('../api')
    const result = await adminListBots('BNB_USDT', 'RUNNING')
    expect(result).toHaveLength(1)
    expect(result[0].bot_id).toBe('BNB_USDT_mm_1')
  })
})
