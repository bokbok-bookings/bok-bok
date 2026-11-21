'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import { FormEvent, useState, Suspense } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'

function ForgotPasswordForm() {
  const { isAr, localeHref } = useLanguage()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || (isAr ? 'حدث خطأ أثناء إرسال الرابط. يرجى المحاولة مرة أخرى.' : 'An error occurred while sending the reset link. Please try again.'))
        setLoading(false)
        return
      }

      setSubmittedEmail(email)
      setSubmitted(true)
      setLoading(false)
    } catch {
      setError(
        isAr
          ? 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
          : 'Network error occurred. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[28px] bg-surface p-7 shadow-xl border border-border sm:p-10">
      <Link
        href={localeHref('/login')}
        className="inline-flex items-center text-xs font-bold text-primary hover:underline"
      >
        {isAr ? '← العودة لتسجيل الدخول' : '← Back to sign in'}
      </Link>

      {!submitted ? (
        <>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-.05em] text-primary">
            {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isAr
              ? 'أدخل عنوان بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.'
              : 'Enter your registered email address and we will send you a secure link to reset your password.'}
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-accent hover:bg-accent-hover px-5 py-3 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? isAr
                  ? 'جاري إرسال الرابط...'
                  : 'Sending reset link...'
                : isAr
                  ? 'إرسال رابط إعادة التعيين'
                  : 'Send reset link'}
            </button>
          </form>
        </>
      ) : (
        <div className="mt-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            <svg
              className="size-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-primary">
            {isAr ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {isAr ? (
              <>
                إذا كان البريد <strong className="text-primary">{submittedEmail}</strong> مسجلاً لدينا، فقد أرسلنا إليه رابطاً لإعادة تعيين كلمة المرور. الرابط صالح لمدة <strong className="text-primary">ساعة واحدة</strong>.
              </>
            ) : (
              <>
                If an account exists for <strong className="text-primary">{submittedEmail}</strong>, we have sent a link to reset your password. The link expires in <strong className="text-primary">1 hour</strong>.
              </>
            )}
          </p>

          <div className="mt-4 rounded-xl border border-border bg-background p-3 text-[11px] text-muted-foreground">
            {isAr
              ? 'لم يصلك البريد؟ يرجى التحقق من مجلد الرسائل غير المرغوب فيها (Spam) أو التأكد من صحة البريد المدخل.'
              : "Didn't receive the email? Check your spam/junk folder or confirm you entered the correct address."}
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false)
                setEmail('')
              }}
              className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-bold text-primary hover:bg-secondary/40 transition cursor-pointer"
            >
              {isAr ? 'إرسال بريد إلكتروني آخر' : 'Try another email'}
            </button>

            <Link
              href={localeHref('/login')}
              className="w-full rounded-full bg-accent hover:bg-accent-hover px-4 py-2.5 text-xs font-bold text-primary text-center transition shadow-xs"
            >
              {isAr ? 'العودة لتسجيل الدخول' : 'Return to sign in'}
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-border pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          {isAr ? 'تتذكر كلمة المرور؟ ' : 'Remember your password? '}
          <Link href={localeHref('/login')} className="font-bold text-primary hover:underline">
            {isAr ? 'تسجيل الدخول' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const { isAr, localeHref } = useLanguage()

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md py-12">
        <div className="mb-8">
          <BrandLogo href={localeHref('/')} />
        </div>
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-muted-foreground">
              {isAr ? 'جاري التحميل...' : 'Loading...'}
            </div>
          }
        >
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
