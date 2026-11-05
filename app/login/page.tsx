'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import { FormEvent, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const queryError = searchParams.get('error')
  const { isAr, localeHref } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(queryError || '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || (isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password'))
        setLoading(false)
        return
      }

      const target = callbackUrl || data.redirectTo || '/dashboard'
      router.push(target)
      router.refresh()
    } catch {
      setError(isAr ? 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.' : 'An error occurred during login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[28px] bg-surface p-7 shadow-xl border border-border sm:p-10">
      <Link
        href={localeHref('/')}
        className="inline-flex items-center text-xs font-bold text-primary hover:underline"
      >
        {isAr ? '← العودة للرئيسية' : '← Back home'}
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-[-.05em] text-primary">
        {isAr ? 'مرحباً بعودتك.' : 'Welcome back.'}
      </h1>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {isAr
          ? 'سجل الدخول لإدارة مواعيدك، جدول أعمالك، أو جلساتك.'
          : 'Sign in to manage your appointments, schedule, or marketplace operations.'}
      </p>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Google Sign In Button */}
      <div className="mt-6">
        <a
          href={`/api/auth/google/signin?role=client${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-surface px-4 py-3 text-xs font-bold text-primary hover:border-accent hover:bg-secondary/40 transition shadow-2xs"
        >
          <svg className="size-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isAr ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
        </a>
      </div>

      <div className="relative my-6 text-center text-xs text-muted-foreground">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-surface px-3 text-[11px] uppercase font-bold text-muted-foreground">
          {isAr ? 'أو عبر البريد الإلكتروني' : 'or continue with email'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-xs font-bold text-primary">
          {isAr ? 'البريد الإلكتروني' : 'Email address'}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent"
          />
        </label>

        <label className="text-xs font-bold text-primary">
          {isAr ? 'كلمة المرور' : 'Password'}
          <div className="mt-1.5 flex rounded-xl border border-border bg-background focus-within:border-accent">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter your password'}
              className="w-full rounded-xl bg-transparent px-4 py-2.5 text-xs text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-3.5 text-[11px] font-bold text-muted-foreground hover:text-primary"
            >
              {showPassword ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'إظهار' : 'Show')}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-accent hover:bg-accent-hover px-5 py-3 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50"
        >
          {loading ? (isAr ? 'جاري تسجيل الدخول...' : 'Signing in...') : (isAr ? 'تسجيل الدخول' : 'Sign in')}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          {isAr ? 'مستخدم جديد؟ ' : 'New expert or client? '}
          <Link href={localeHref('/signup')} className="font-bold text-primary hover:underline">
            {isAr ? 'أنشئ حساباً الآن' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { isAr, localeHref } = useLanguage()

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md py-12">
        <div className="mb-8">
          <BrandLogo href={localeHref('/')} />
        </div>
        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
