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

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setError('missing token')
      return
    }
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
            {t('verifyEmail.verifying', 'Verifying your email...')}
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
