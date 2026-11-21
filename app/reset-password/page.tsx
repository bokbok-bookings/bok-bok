'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import { FormEvent, useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { isAr, localeHref } = useLanguage()

  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [tokenError, setTokenError] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false)
      setTokenValid(false)
      setTokenError(
        isAr
          ? 'رمز إعادة تعيين كلمة المرور مفقود أو الرابط غير صالح.'
          : 'Password reset token is missing or the link is invalid.'
      )
      return
    }

    let isMounted = true

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token!)}`)
        const data = await res.json()

        if (!isMounted) return

        if (res.ok && data.valid) {
          setTokenValid(true)
        } else {
          setTokenValid(false)
          setTokenError(
            data.error ||
              (isAr
                ? 'رابط إعادة التعيين غير صالح أو انتهت صلاحيته.'
                : 'This reset link is invalid or has expired.')
          )
        }
      } catch {
        if (!isMounted) return
        setTokenValid(false)
        setTokenError(
          isAr
            ? 'تعذر التحقق من صلاحية الرابط. يرجى المحاولة مرة أخرى.'
            : 'Could not verify the reset link. Please try again.'
        )
      } finally {
        if (isMounted) setVerifying(false)
      }
    }

    checkToken()

    return () => {
      isMounted = false
    }
  }, [token, isAr])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(
        isAr
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'
          : 'Password must be at least 6 characters long.'
      )
      return
    }

    if (password !== confirmPassword) {
      setError(
        isAr
          ? 'كلمتا المرور غير متطابقتين.'
          : 'Passwords do not match.'
      )
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || (isAr ? 'فشل إعادة تعيين كلمة المرور.' : 'Failed to reset password.'))
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch {
      setError(
        isAr
          ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
          : 'An unexpected error occurred. Please try again.'
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

      {verifying ? (
        <div className="mt-8 py-8 text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            {isAr ? 'جاري التحقق من صلاحية الرابط...' : 'Verifying reset link...'}
          </p>
        </div>
      ) : !tokenValid ? (
        <div className="mt-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-primary">
            {isAr ? 'الرابط غير صالح أو انتهت صلاحيته' : 'Link Invalid or Expired'}
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {tokenError ||
              (isAr
                ? 'رابط إعادة تعيين كلمة المرور إما مستخدم مسبقاً أو انتهت مدة صلاحيته (ساعة واحدة).'
                : 'This password reset link is invalid, expired, or has already been used.')}
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href={localeHref('/forgot-password')}
              className="w-full rounded-full bg-accent hover:bg-accent-hover px-4 py-2.5 text-xs font-bold text-primary text-center transition shadow-xs"
            >
              {isAr ? 'طلب رابط جديد' : 'Request new reset link'}
            </Link>

            <Link
              href={localeHref('/login')}
              className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-bold text-primary text-center hover:bg-secondary/40 transition"
            >
              {isAr ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
            </Link>
          </div>
        </div>
      ) : success ? (
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-primary">
            {isAr ? 'تمت إعادة تعيين كلمة المرور بنجاح!' : 'Password Reset Successfully!'}
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {isAr
              ? 'تم تحديث كلمة المرور الخاصة بحسابك. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.'
              : 'Your password has been securely updated. You can now log in using your new credentials.'}
          </p>

          <div className="mt-6">
            <Link
              href={localeHref('/login')}
              className="inline-block w-full rounded-full bg-accent hover:bg-accent-hover px-4 py-2.5 text-xs font-bold text-primary text-center transition shadow-xs"
            >
              {isAr ? 'الانتقال لتسجيل الدخول' : 'Proceed to sign in'}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-.05em] text-primary">
            {isAr ? 'إنشاء كلمة مرور جديدة' : 'Create new password'}
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isAr
              ? 'الرجاء إدخال وتأكيد كلمة المرور الجديدة الخاصة بحسابك.'
              : 'Please enter and confirm your new account password.'}
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="text-xs font-bold text-primary">
              {isAr ? 'كلمة المرور الجديدة' : 'New password'}
              <div className="mt-1.5 flex rounded-xl border border-border bg-background focus-within:border-accent">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isAr ? '6 أحرف على الأقل' : 'At least 6 characters'}
                  className="w-full rounded-xl bg-transparent px-4 py-2.5 text-xs text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3.5 text-[11px] font-bold text-muted-foreground hover:text-primary cursor-pointer"
                >
                  {showPassword ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'إظهار' : 'Show')}
                </button>
              </div>
            </label>

            <label className="text-xs font-bold text-primary">
              {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
              <div className="mt-1.5 flex rounded-xl border border-border bg-background focus-within:border-accent">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isAr ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                  className="w-full rounded-xl bg-transparent px-4 py-2.5 text-xs text-foreground outline-none"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-accent hover:bg-accent-hover px-5 py-3 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? isAr
                  ? 'جاري حفظ كلمة المرور...'
                  : 'Updating password...'
                : isAr
                  ? 'إعادة تعيين كلمة المرور'
                  : 'Reset password'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
