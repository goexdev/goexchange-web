import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as api from '../lib/api'

// ResetPassword is the landing page users hit from the link in
// their password-reset email. The flow has three visible states:
//
//   1. token missing or already consumed → fatal error, redirect
//      to forgot-password
//   2. token valid → render a "set new password" form
//   3. submit → call API, on success redirect to /login with a
//      hint that the password changed
//
// The token lives in the URL (query string). The user enters
// the new password in a form. We do not pre-fill anything from
// the URL aside from the token itself.
export default function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [tokenStatus, setTokenStatus] = useState<'unknown' | 'ok' | 'bad'>(
    token ? 'unknown' : 'bad'
  )

  useEffect(() => {
    if (!token) {
      setTokenStatus('bad')
    } else {
      setTokenStatus('ok')
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError(t('resetPassword.tooShort', 'Password must be at least 8 characters'))
      return
    }
    if (password !== confirm) {
      setError(t('resetPassword.mismatch', 'Passwords do not match'))
      return
    }
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      // Success — route to login so the user signs in fresh.
      // We do not auto-store a JWT here because the spec
      // says the user must sign in with the new password.
      navigate('/login?reset=1', { replace: true })
    } catch (err: any) {
      setError(err.message || 'reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] px-4">
      <div className="w-full max-w-md bg-[#181c22] border border-[#262b33] rounded-xl p-8">
        <div className="text-lg font-bold text-white mb-4">goexchange</div>
        {tokenStatus === 'bad' ? (
          <div className="text-[#c9ced6]">
            <h1 className="text-xl font-semibold text-white mb-3">
              {t('resetPassword.missingTitle', 'Reset link is invalid')}
            </h1>
            <p className="mb-4 text-[#9aa3af]">
              {t('resetPassword.missingBody', 'The link is missing the token. Open the email and click the button again, or request a new reset.')}
            </p>
            <Link
              to="/login"
              className="inline-block px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb]"
            >
              {t('resetPassword.backToLogin', 'Back to login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-xl font-semibold text-white mb-3">
              {t('resetPassword.title', 'Set a new password')}
            </h1>
            <p className="text-sm text-[#9aa3af] mb-6">
              {t('resetPassword.help', 'Enter a new password for your account.')}
            </p>

            <label className="block mb-2 text-sm text-[#c9ced6]">
              {t('resetPassword.newPassword', 'New password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full mb-4 px-3 py-2 bg-[#0f1115] border border-[#262b33] rounded text-white"
              minLength={8}
              required
            />

            <label className="block mb-2 text-sm text-[#c9ced6]">
              {t('resetPassword.confirm', 'Confirm new password')}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full mb-4 px-3 py-2 bg-[#0f1115] border border-[#262b33] rounded text-white"
              minLength={8}
              required
            />

            {error && <div className="mb-4 text-sm text-[#e57373]">{error}</div>}

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] disabled:opacity-50"
            >
              {busy
                ? t('resetPassword.submitting', 'Updating...')
                : t('resetPassword.submit', 'Update password')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
