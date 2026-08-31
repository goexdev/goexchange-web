import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as api from '../lib/api'

// ForgotPassword is the entry point for the password-reset flow.
// The user types their email, the server queues an email if the
// address matches a real account (and silently does nothing if
// it does not — anti-enumeration). The page always shows the
// same "check your inbox" message so an attacker cannot use the
// endpoint to enumerate accounts.
export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.forgotPassword(email.trim().toLowerCase())
      setSubmitted(true)
    } catch (err: any) {
      // Even on error we keep the user-facing message uniform —
      // the server's actual response was probably 200 anyway,
      // but if a 5xx leaks we do not want to reveal it.
      setSubmitted(true)
      setError('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] px-4">
      <div className="w-full max-w-md bg-[#181c22] border border-[#262b33] rounded-xl p-8">
        <div className="text-lg font-bold text-white mb-4">goexchange</div>
        {submitted ? (
          <div className="text-[#c9ced6]">
            <h1 className="text-xl font-semibold text-white mb-3">
              {t('forgotPassword.sentTitle', 'Check your inbox')}
            </h1>
            <p>
              {t('forgotPassword.sentBody', 'If that email is registered, a reset link has been sent. It expires in 60 minutes.')}
            </p>
            <Link
              to="/login"
              className="inline-block mt-6 px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb]"
            >
              {t('forgotPassword.backToLogin', 'Back to login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-xl font-semibold text-white mb-3">
              {t('forgotPassword.title', 'Forgot your password?')}
            </h1>
            <p className="text-sm text-[#9aa3af] mb-6">
              {t('forgotPassword.help', 'Enter your email and we will send a link to set a new password.')}
            </p>

            <label className="block mb-2 text-sm text-[#c9ced6]">
              {t('forgotPassword.email', 'Email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full mb-4 px-3 py-2 bg-[#0f1115] border border-[#262b33] rounded text-white"
            />

            {error && <div className="mb-4 text-sm text-[#e57373]">{error}</div>}

            <button
              type="submit"
              disabled={busy || !email}
              className="w-full px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] disabled:opacity-50"
            >
              {busy
                ? t('forgotPassword.submitting', 'Sending...')
                : t('forgotPassword.submit', 'Send reset link')}
            </button>

            <div className="mt-4 text-center text-sm">
              <Link to="/login" className="text-[#9aa3af] hover:text-white">
                {t('forgotPassword.backToLogin', 'Back to login')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
