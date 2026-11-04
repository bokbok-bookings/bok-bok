'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import { BokBok } from '@/components/brand/bok-bok'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'

export default function SignupPage() {
  const router = useRouter()
  const { isAr, localeHref } = useLanguage()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'expert' | 'client'>('expert')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password, role }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || (isAr ? 'فشل إنشاء الحساب' : 'Failed to create account'))
        setLoading(false)
        return
      }

      router.push(data.redirectTo || '/dashboard')
      router.refresh()
    } catch {
      setError(isAr ? 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقاً.' : 'An error occurred during account creation. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md py-12">
        <div className="mb-8">
          <BrandLogo href={localeHref('/')} />
        </div>

        <div className="rounded-[28px] bg-surface p-7 shadow-xl border border-border sm:p-10">
          <Link
            href={localeHref('/')}
            className="inline-flex items-center text-xs font-bold text-primary hover:underline"
          >
            {isAr ? '← العودة للرئيسية' : '← Back to directory'}
          </Link>

          <h1 className="mt-6 text-3xl font-semibold tracking-[-.05em] text-primary">
            {isAr ? 'انضم إلى بوك بوك.' : <>Join <BokBok />.</>}
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isAr
              ? 'أنشئ حسابك لتقديم استشاراتك أو لحجز جلسات مع نخبة من الخبراء.'
              : 'Create your account to start offering sessions or booking top advisors.'}
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {/* Account Role Selector */}
            <div>
              <p className="text-xs font-bold text-primary mb-2">
                {isAr ? 'أرغب في الانضمام كـ:' : 'I am joining as:'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('expert')}
                  className={`rounded-2xl border p-3 text-start transition ${role === 'expert'
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary'
                    }`}
                >
                  <p className="text-xs font-bold">{isAr ? 'خبير ومستشار' : 'Expert'}</p>
                  <p className="mt-0.5 text-[10px] opacity-80">
                    {isAr ? 'تقديم الجلسات وإدارة المواعيد' : 'Offer sessions & manage time'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`rounded-2xl border p-3 text-start transition ${role === 'client'
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary'
                    }`}
                >
                  <p className="text-xs font-bold">{isAr ? 'مستفيد / عميل' : 'Client'}</p>
                  <p className="mt-0.5 text-[10px] opacity-80">
                    {isAr ? 'حجز الاستشارات والجلسات' : 'Book appointments'}
                  </p>
                </button>
              </div>
            </div>

            <label className="text-xs font-bold text-primary">
              {isAr ? 'الاسم بالكامل' : 'Full name'}
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={isAr ? 'مثال: ليلى حسن' : 'e.g. Layla Hassan'}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent"
              />
            </label>

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
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAr ? '٦ أحرف على الأقل' : 'At least 6 characters'}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-accent hover:bg-accent-hover px-5 py-3 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50"
            >
              {loading
                ? (isAr ? 'جاري إنشاء الحساب...' : 'Creating account...')
                : role === 'expert'
                  ? (isAr ? 'إنشاء حساب خبير ←' : 'Create Expert Account →')
                  : (isAr ? 'إنشاء حساب مستفيد' : 'Create Client Account')}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {isAr ? 'لديك حساب بالفعل؟ ' : 'Already a member? '}
              <Link href={localeHref('/login')} className="font-bold text-primary hover:underline">
                {isAr ? 'تسجيل الدخول' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
