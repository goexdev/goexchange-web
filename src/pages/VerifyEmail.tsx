import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as api from '../lib/api'

// VerifyEmail is the landing page users hit when they click the
// link in their signup confirmation email. The route reads the
// `token` query string, calls the API to consume it, then either:
//   - stores the returned JWT and redirects to the dashboard
//     (success path), or
//   - shows an actionable error message (failure path — expired
//     token, tampered token, generic 4xx).
//
// Why this exists: the email link points at the SPA path
// `/verify-email?token=...` (not the API path), so nginx's SPA
// fallback serves this page and the user gets a real UI flow
// instead of raw JSON.
export default function VerifyEmail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [error, setError] = useState<string>('')
  // Mounted timestamp is purely for the UI so the user sees
  // that something is happening during the brief window
  // before useEffect fires (and again, if anything in the
  // chain stalls).
  const [mountedAt] = useState(() => Date.now())
  const [, force] = useState(0)
  // Tick once a second so the "Started N seconds ago" label
  // updates while we wait. Cheap because the component
  // re-renders only this string.
  useEffect(() => {
    if (status !== 'pending') return
    const t = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [status])

  function elapsedSec(): number {
    return Math.max(0, Math.floor((Date.now() - mountedAt) / 1000))
  }

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setError('missing token')
      return
    }
    // Log so testers can confirm the route actually ran. The
    // "v=2026-08-31-1" tag bumps when the handler changes —
    // helps when the bundle hash stays the same across small
    // edits.
    // eslint-disable-next-line no-console
    console.info('[verify-email] handler v=2026-08-31-1 token-prefix=' + token.slice(0, 8))
    api.verifyEmail(token)
      .then((res) => {
        if (res.token) {
          localStorage.setItem('goexchange_token', res.token)
          setStatus('success')
          // Brief pause so the user reads "verified" before the
          // dashboard loads.
          setTimeout(() => navigate('/user?tab=overview'), 1200)
        } else {
          setStatus('error')
          setError(res.message || 'verification failed')
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[verify-email] fetch failed', err)
        setStatus('error')
        // The API error message is intentionally short and
        // public-safe (no internal SQL state, no token contents).
        setError(err.message || 'verification failed')
      })
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] px-4">
      <div className="w-full max-w-md bg-[#181c22] border border-[#262b33] rounded-xl p-8">
        <div className="text-lg font-bold text-white mb-4">goexchange</div>
        {status === 'pending' && (
          <div className="text-[#c9ced6]">
            <div className="flex items-center gap-3 mb-3">
              <span
                data-testid="verify-email-spinner"
                className="inline-block w-5 h-5 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"
                aria-hidden
              />
              <h1 className="text-xl font-semibold text-white">
                {t('verifyEmail.verifying', 'Verifying your email...')}
              </h1>
            </div>
            <p className="text-sm text-[#9aa3af]">
              {t('verifyEmail.elapsed', 'Started {{n}} seconds ago', { n: elapsedSec() })}
            </p>
            <p className="text-xs text-[#7a8492] mt-2">
              {t('verifyEmail.fallbackHint', 'If this hangs, open the console (F12) for details.')}
            </p>
          </div>
        )}
        {status === 'success' && (
          <div className="text-[#c9ced6]">
            <h1 className="text-xl font-semibold text-white mb-3">
              {t('verifyEmail.successTitle', 'Email verified')}
            </h1>
            <p>{t('verifyEmail.successBody', 'You are now signed in. Redirecting to your dashboard...')}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="text-[#c9ced6]">
            <h1 className="text-xl font-semibold text-white mb-3">
              {t('verifyEmail.errorTitle', 'Verification failed')}
            </h1>
            <p className="mb-4 text-[#e57373]">{error}</p>
            <p className="text-sm text-[#9aa3af]">
              {t('verifyEmail.errorHelp', 'The link may have expired or already been used. Try signing up again or requesting a new verification email.')}
            </p>
            <Link
              to="/login"
              className="inline-block mt-6 px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb]"
            >
              {t('verifyEmail.backToLogin', 'Back to login')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
