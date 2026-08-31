import { Link, useNavigate } from 'react-router-dom'
import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import * as api from '../lib/api'
import { useToast } from '../components/Toast'

export function Login() {
  useDocumentTitle('Sign In - goexchange')
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  // True when the server returned 403 with
  // requires_email_verification; we surface a "check your
  // inbox" banner and offer a resend link.
  const [requiresEmailVerify, setRequiresEmailVerify] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setSubmitting(true)
    try {
      const result = await login(email, password, requires2FA ? twoFactorCode : undefined)
      if (result.requires_2fa) {
        // Show 2FA input
        setRequires2FA(true)
        toast.showToast(t('auth.login.twoFactorPrompt', 'Enter your 2FA code'), 'info')
      } else if ((result as any).requires_email_verification) {
        // Account exists but is not yet verified — surface
        // the inline banner so the user knows to check
        // their inbox. We do NOT proceed with login.
        setRequiresEmailVerify(true)
      } else {
        // Login complete
        toast.showToast(t('auth.login.welcomeBack', 'Welcome back!'), 'success')
        navigate('/')
      }
    } catch (e: any) {
      setErr(e.message)
      toast.showToast(e.message || 'Login failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // resendVerification asks the server to issue a fresh
  // verification email. The server always returns 200, so
  // this is safe to call even when the email is wrong (the
  // server-side anti-enumeration stance applies).
  async function resendVerification() {
    setResendBusy(true)
    try {
      await api.resendVerification(email.trim().toLowerCase())
      setResendSent(true)
    } catch {
      // ignore — server is intentionally opaque
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">{t('auth.login.title')}</h1>
        <p className="text-sm text-gray-400 mb-6">{t('auth.login.subtitle')}</p>
        {err && <div className="bg-red-900 text-red-200 p-3 rounded mb-4 text-sm">{err}</div>}
        {requiresEmailVerify && (
          <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 p-3 rounded mb-4 text-sm">
            <p className="font-semibold mb-1">
              {t('auth.login.verifyTitle', 'Verify your email to sign in')}
            </p>
            <p className="mb-2">
              {t('auth.login.verifyBody', 'Your account exists but the email address has not been verified yet. Check your inbox (and spam folder) for the link we sent when you signed up.')}
            </p>
            {resendSent ? (
              <p className="text-xs">
                {t('auth.login.verifyResent', 'If the address is correct we sent a fresh link.')}
              </p>
            ) : (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendBusy}
                className="text-blue-300 hover:text-blue-200 underline disabled:opacity-50"
              >
                {resendBusy
                  ? t('auth.login.verifyResending', 'Resending...')
                  : t('auth.login.verifyResend', 'Resend verification email')}
              </button>
            )}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('auth.login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full bg-gray-700 px-3 py-2 rounded text-white"
            />
          </div>
          {requires2FA && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                {t('auth.login.twoFactorCode') || 'Two-Factor Code'}
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
                maxLength={10}
                placeholder={t("auth.login.twoFactorPlaceholder", "123456 (or backup code)")}
                autoFocus
                className="w-full bg-gray-700 px-3 py-2 rounded text-white font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('auth.login.twoFactorHint', 'Enter the 6-digit code from your authenticator app, or one of your backup codes.')}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('auth.login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-gray-700 px-3 py-2 rounded text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded"
          >
            {submitting ? t('common.loading') : t('auth.login.signIn')}
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-4">
          <Link to="/forgot-password" className="text-blue-400 hover:underline">
            {t('auth.login.forgot', 'Forgot password?')}
          </Link>
        </p>
        <p className="text-sm text-gray-400 mt-2">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="text-blue-400 hover:underline">{t('auth.login.signUp')}</Link>
        </p>
      </div>
    </div>
  )
}
