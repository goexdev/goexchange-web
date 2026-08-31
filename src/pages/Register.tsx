import { Link, useNavigate } from 'react-router-dom'
import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useAuth } from '../lib/auth'
import * as api from '../lib/api'

function passwordStrength(p: string): number {
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[A-Z]/.test(p)) s++
  if (/[a-z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return Math.min(4, Math.floor(s / 1.5))
}

export function Register() {
  useDocumentTitle('Sign Up - goexchange')
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Set true after register+login fails with the
  // requires_email_verification branch, so the page below
  // can swap the form for a "check your inbox" panel.
  const [submitted, setSubmitted] = useState(false)

  const strength = passwordStrength(password)
  const strengthLabel = () => {
    return [t('auth.register.weak'), t('auth.register.fair'), t('auth.register.good'), t('auth.register.strong')][strength]
  }
  const strengthColor = () => {
    return ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][strength]
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (password !== confirmPassword) {
      setErr('Passwords do not match')
      return
    }
    if (!agree) {
      setErr('Please agree to terms')
      return
    }
    setSubmitting(true)
    try {
      // The new flow (migration 0028) refuses to issue a JWT
      // until the user has clicked the link in the verification
      // email. So we register, then immediately call login
      // ourselves — that will return { requires_email_verification: true }
      // and the page below surfaces a "check your inbox" hint.
      await api.register(email, password)
      try {
        await login(email, password)
        navigate('/')
      } catch (loginErr: any) {
        // Expected path: the user is not verified yet. Show the
        // "check your email" hint instead of a generic error.
        setSubmitted(true)
      }
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">{t('auth.register.title')}</h1>
        <p className="text-sm text-gray-400 mb-6">
            {t('auth.register.subtitle', { amount: new Intl.NumberFormat(i18n.language).format(10000) })}
          </p>
        {err && <div className="bg-red-900 text-red-200 p-3 rounded mb-4 text-sm">{err}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('auth.register.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full bg-gray-700 px-3 py-2 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('auth.register.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full bg-gray-700 px-3 py-2 rounded text-white"
            />
            <div className="mt-2">
              <div className="text-xs text-gray-400 mb-1">{t('auth.register.passwordStrength')}: {strengthLabel()}</div>
              <div className="h-1 bg-gray-700 rounded">
                <div className={`h-full rounded transition-all ${strengthColor()}`} style={{ width: `${(strength + 1) * 25}%` }} />
              </div>
              <div className="text-xs text-gray-500 mt-1">{t('auth.register.passwordHint')}</div>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('auth.register.confirm')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full bg-gray-700 px-3 py-2 rounded text-white"
            />
          </div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={agree}
              onChange={e => setAgree(e.target.checked)}
              className="mt-1"
              required
            />
            <span className="text-sm text-gray-300">{t('auth.register.agreeTerms')}</span>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded"
          >
            {submitting ? t('common.loading') : t('auth.register.create')}
          </button>
        </form>
        {submitted && (
          <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded">
            <h2 className="text-lg font-semibold text-white mb-2">
              {t('auth.register.checkInboxTitle', 'Check your inbox')}
            </h2>
            <p className="text-sm text-gray-300">
              {t('auth.register.checkInboxBody', 'We sent a verification link to your email. Click it within 24 hours to activate your account, then sign in.')}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('auth.register.checkInboxSpam', 'Did not get it? Check spam, or wait a minute and try again from the login page.')}
            </p>
          </div>
        )}
        {!submitted && (
          <p className="text-sm text-gray-400 mt-4">
            {t('auth.register.haveAccount')}{' '}
            <Link to="/login" className="text-blue-400 hover:underline">{t('auth.register.signIn')}</Link>
          </p>
        )}
        {submitted && (
          <p className="text-sm text-gray-400 mt-4">
            <Link to="/login" className="text-blue-400 hover:underline">
              {t('auth.register.goSignIn', 'Go to sign in')}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
