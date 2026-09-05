import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as api from '../lib/api'
import { AdminLayout } from '../components/AdminLayout'
import { useToast } from '../components/Toast'
import { ConfirmModal } from '../components/ConfirmModal'
import { formatQuoteScaled, formatBaseScaled } from '../lib/scale'

// Admin page: market-making bot fleet management.
//
// Each row in the fleet table corresponds to one
// mmbot_bots row in the DB. The page wraps the four
// admin RPCs the public API exposes:
//
//   GET    /admin/mmbot/list?pair=&status=
//   GET    /admin/mmbot/status?bot_id=
//   POST   /admin/mmbot/start
//   POST   /admin/mmbot/stop
//
// Auto-refresh every 5s while the page is mounted so
// open_orders / quote_balance / pnl_quote stay in sync
// with the matching engine. The "Last refresh" timestamp
// gives operators a way to confirm the page is not stale.
export function AdminMMBot() {
  const { t } = useTranslation()
  const toast = useToast()

  const [bots, setBots] = useState<api.BotState[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [statusFilter, setStatusFilter] = useState<api.BotStatus | ''>('')
  const [pairFilter, setPairFilter] = useState('')

  // Start form state
  const [showStart, setShowStart] = useState(false)
  const [startForm, setStartForm] = useState<api.StartBotParams>({
    pair: '',
    mid_price: '',
    quote_seed: '',
    base_seed: '',
    spread_bps: 10,
  })
  const [starting, setStarting] = useState(false)

  // Stop confirmation modal
  const [stopTarget, setStopTarget] = useState<api.BotState | null>(null)
  const [returnInventory, setReturnInventory] = useState(true)
  const [stopping, setStopping] = useState(false)

  const load = useCallback(async () => {
    setErr('')
    try {
      const list = await api.adminListBots(
        pairFilter || undefined,
        statusFilter || undefined
      )
      setBots(list)
      setLastRefresh(new Date())
    } catch (e: any) {
      setErr(e.message || t('common.error', 'Error'))
    } finally {
      setLoading(false)
    }
  }, [pairFilter, statusFilter, t])

  useEffect(() => {
    load()
  }, [load])

  // Auto-refresh on the same interval regardless of filter
  // changes so the open_orders / pnl columns stay current.
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      load()
    }, 5000)
    return () => clearInterval(id)
  }, [autoRefresh, load])

  async function handleStart() {
    if (
      !startForm.pair ||
      !startForm.mid_price ||
      !startForm.quote_seed ||
      !startForm.base_seed
    ) {
      toast.showToast(
        t('admin.mmbot.startMissingFields', 'pair, mid_price, quote_seed, base_seed are required'),
        'error'
      )
      return
    }
    setStarting(true)
    try {
      const bot = await api.adminStartBot(startForm)
      toast.showToast(
        t('admin.mmbot.started', `Bot ${bot.bot_id} started`),
        'success'
      )
      setShowStart(false)
      setStartForm({
        pair: '',
        mid_price: '',
        quote_seed: '',
        base_seed: '',
        spread_bps: 10,
      })
      await load()
    } catch (e: any) {
      toast.showToast(e.message || t('common.error', 'Error'), 'error')
    } finally {
      setStarting(false)
    }
  }

  async function handleStop() {
    if (!stopTarget) return
    setStopping(true)
    try {
      const res = await api.adminStopBot(stopTarget.bot_id, returnInventory)
      const rq = res.returned_quote || '0'
      const rb = res.returned_base || '0'
      toast.showToast(
        t(
          'admin.mmbot.stopped',
          `Bot ${stopTarget.bot_id} stopped. Returned ${rq} quote, ${rb} base`
        ),
        'success'
      )
      setStopTarget(null)
      await load()
    } catch (e: any) {
      toast.showToast(e.message || t('common.error', 'Error'), 'error')
    } finally {
      setStopping(false)
    }
  }

  const statusOptions: { value: api.BotStatus | ''; label: string }[] = [
    { value: '', label: t('admin.mmbot.statusAll', 'All') },
    { value: 'RUNNING', label: t('admin.mmbot.statusRunning', 'Running') },
    { value: 'SEEDING', label: t('admin.mmbot.statusSeeding', 'Seeding') },
    { value: 'READY', label: t('admin.mmbot.statusReady', 'Ready') },
    { value: 'STOPPING', label: t('admin.mmbot.statusStopping', 'Stopping') },
    { value: 'STOPPED', label: t('admin.mmbot.statusStopped', 'Stopped') },
    { value: 'FAILED', label: t('admin.mmbot.statusFailed', 'Failed') },
  ]

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">
              {t('admin.mmbot.title', 'Market-Making Bots')}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t(
                'admin.mmbot.subtitle',
                'Per-pair liquidity providers. Each bot places continuous bid+ask quotes around a mid price.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted flex items-center gap-1">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              {t('admin.mmbot.autoRefresh', 'Auto-refresh')}
            </label>
            <button
              onClick={load}
              className="btn-secondary text-sm"
              data-testid="refresh-mmbot"
            >
              {t('common.refresh', 'Refresh')}
            </button>
            <button
              onClick={() => setShowStart(true)}
              className="btn-primary text-sm"
              data-testid="start-mmbot"
            >
              {t('admin.mmbot.start', 'Start bot')}
            </button>
          </div>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {err}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 bg-gray-800/50 border border-gray-700 rounded p-3">
          <div>
            <label className="block text-xs text-muted mb-1">
              {t('admin.mmbot.pair', 'Pair')}
            </label>
            <input
              type="text"
              value={pairFilter}
              onChange={(e) => setPairFilter(e.target.value.toUpperCase())}
              placeholder="BNB_USDT"
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
              data-testid="mmbot-pair-filter"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">
              {t('admin.mmbot.status', 'Status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as api.BotStatus | '')}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
              data-testid="mmbot-status-filter"
            >
              {statusOptions.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {lastRefresh && (
            <div className="text-xs text-muted ml-auto">
              {t('admin.lastRefresh', 'Last refresh:')} {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Bot list */}
        {loading && bots.length === 0 ? (
          <div className="text-muted text-sm p-4">
            {t('common.loadingEllipsis', 'Loading...')}
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded p-8 text-center text-muted">
            {t('admin.mmbot.empty', 'No bots. Click "Start bot" to create one.')}
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-800/30 border border-gray-700 rounded">
            <table className="w-full text-sm" data-testid="mmbot-table">
              <thead>
                <tr className="text-left text-muted border-b border-gray-700">
                  <th className="px-3 py-2">{t('admin.mmbot.colBotId', 'Bot ID')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colPair', 'Pair')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colStatus', 'Status')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colMid', 'Mid')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colSpread', 'Spread bps')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colQuoteBal', 'Quote bal')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colBaseBal', 'Base bal')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colPnl', 'PnL (quote)')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colOpenOrders', 'Open orders')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colLastError', 'Last error')}</th>
                  <th className="px-3 py-2">{t('admin.mmbot.colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((b) => (
                  <tr
                    key={b.bot_id}
                    className="border-b border-gray-800 hover:bg-gray-800/40"
                    data-testid="mmbot-row"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{b.bot_id}</td>
                    <td className="px-3 py-2">{b.pair}</td>
                    <td className="px-3 py-2">
                      <BotStatusBadge status={b.status} />
                    </td>
                    <td className="px-3 py-2 font-mono">{b.mid_price}</td>
                    <td className="px-3 py-2 font-mono">{b.spread_bps}</td>
                    <td className="px-3 py-2 font-mono" title={b.quote_balance}>
                      {formatQuoteScaled(b.quote_balance)}
                    </td>
                    <td className="px-3 py-2 font-mono" title={b.base_balance}>
                      {formatBaseScaled(b.base_balance)}
                    </td>
                    <td
                      className={`px-3 py-2 font-mono ${
                        Number(b.pnl_quote) < 0 ? 'text-red-400' : 'text-green-400'
                      }`}
                      title={b.pnl_quote}
                    >
                      {formatQuoteScaled(b.pnl_quote)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {b.open_orders?.length || 0}
                    </td>
                    <td className="px-3 py-2 text-xs text-red-300 max-w-xs truncate">
                      {b.last_error || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setStopTarget(b)}
                        disabled={
                          b.status === 'STOPPED' || b.status === 'STOPPING'
                        }
                        className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        data-testid="mmbot-stop"
                      >
                        {t('admin.mmbot.stop', 'Stop')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Start modal */}
      {showStart && (
        <StartBotModal
          form={startForm}
          setForm={setStartForm}
          onClose={() => setShowStart(false)}
          onSubmit={handleStart}
          submitting={starting}
        />
      )}

      {/* Stop confirmation */}
      {stopTarget && (
        <ConfirmModal
          open={true}
          variant="danger"
          title={t('admin.mmbot.stopTitle', 'Stop market-making bot?')}
          message={t(
            'admin.mmbot.stopMessage',
            `Stop ${stopTarget.bot_id} (${stopTarget.pair})?\n\nThis cancels all open orders and (if "return inventory" is checked) transfers the bot's quote/base balance back to the treasury.\n\nCurrent state:\n  Quote balance: ${formatQuoteScaled(stopTarget.quote_balance)}\n  Base balance:  ${formatBaseScaled(stopTarget.base_balance)}\n  Open orders:   ${stopTarget.open_orders?.length || 0}\n  PnL (quote):   ${formatQuoteScaled(stopTarget.pnl_quote)}`
          )}
          confirmText={t('admin.mmbot.stopConfirm', 'Stop bot')}
          cancelText={t('common.cancel', 'Cancel')}
          onConfirm={handleStop}
          onCancel={() => setStopTarget(null)}
        />
      )}
      {stopTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md w-full mx-4 pointer-events-auto">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={returnInventory}
                onChange={(e) => setReturnInventory(e.target.checked)}
                data-testid="mmbot-return-inventory"
              />
              {t('admin.mmbot.returnInventory', 'Return inventory to treasury')}
            </label>
            <p className="text-xs text-muted mt-2">
              {t(
                'admin.mmbot.returnInventoryHelp',
                'If unchecked the bot stops but its quote/base balance stays in the bot wallet. Use the audit log to see where it ended up.'
              )}
            </p>
            {stopping && (
              <div className="text-xs text-muted mt-2">
                {t('admin.mmbot.stopping', 'Stopping...')}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function BotStatusBadge({ status }: { status: api.BotStatus }) {
  const colorMap: Record<api.BotStatus, string> = {
    UNSPECIFIED: 'bg-gray-600 text-gray-200',
    STOPPED: 'bg-gray-600 text-gray-200',
    SEEDING: 'bg-yellow-600 text-yellow-100',
    READY: 'bg-blue-600 text-blue-100',
    RUNNING: 'bg-green-600 text-green-100',
    STOPPING: 'bg-orange-600 text-orange-100',
    FAILED: 'bg-red-600 text-red-100',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-mono ${colorMap[status] || colorMap.UNSPECIFIED}`}
    >
      {status}
    </span>
  )
}

function StartBotModal({
  form,
  setForm,
  onClose,
  onSubmit,
  submitting,
}: {
  form: api.StartBotParams
  setForm: (f: api.StartBotParams) => void
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-full mx-4 p-6">
        <h2 className="text-lg font-bold mb-3">
          {t('admin.mmbot.startTitle', 'Start market-making bot')}
        </h2>
        <div className="space-y-3">
          <Field
            label={t('admin.mmbot.pair', 'Pair')}
            value={form.pair}
            onChange={(v) => setForm({ ...form, pair: v.toUpperCase() })}
            placeholder="BNB_USDT"
            testId="mmbot-start-pair"
          />
          <Field
            label={t('admin.mmbot.midPrice', 'Mid price')}
            value={form.mid_price}
            onChange={(v) => setForm({ ...form, mid_price: v })}
            placeholder="50000"
            testId="mmbot-start-mid"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t('admin.mmbot.quoteSeed', 'Quote seed')}
              value={form.quote_seed}
              onChange={(v) => setForm({ ...form, quote_seed: v })}
              placeholder="100"
              testId="mmbot-start-qseed"
            />
            <Field
              label={t('admin.mmbot.baseSeed', 'Base seed')}
              value={form.base_seed}
              onChange={(v) => setForm({ ...form, base_seed: v })}
              placeholder="0.002"
              testId="mmbot-start-bseed"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">
              {t('admin.mmbot.spreadBps', 'Spread (bps)')}
            </label>
            <input
              type="number"
              min={1}
              value={form.spread_bps ?? 10}
              onChange={(e) =>
                setForm({ ...form, spread_bps: Number(e.target.value) || 10 })
              }
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm w-full"
              data-testid="mmbot-start-spread"
            />
          </div>
          <Field
            label={t('admin.mmbot.treasuryWallet', 'Treasury wallet (UUID, optional)')}
            value={form.treasury_wallet || ''}
            onChange={(v) => setForm({ ...form, treasury_wallet: v })}
            placeholder=""
            testId="mmbot-start-treasury"
          />
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600"
            disabled={submitting}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
            data-testid="mmbot-start-submit"
          >
            {submitting
              ? t('admin.mmbot.starting', 'Starting...')
              : t('admin.mmbot.start', 'Start bot')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  testId?: string
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm w-full"
        data-testid={testId}
      />
    </div>
  )
}
