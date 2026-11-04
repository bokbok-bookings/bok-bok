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
  const { isAr, localeHref } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
