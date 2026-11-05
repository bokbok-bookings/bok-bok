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
  const [fName, setFName] = useState('')
  const [lName, setLName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'expert' | 'client'>('expert')
  const [accountType, setAccountType] = useState<'expert' | 'organization'>('expert')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successNotice, setSuccessNotice] = useState<{
    show: boolean
    email: string
    redirectTo: string
  } | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const displayName = `${fName.trim()} ${lName.trim()}`.trim()

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fName: fName.trim(),
          lName: lName.trim(),
          displayName,
          email,
          password,
          role,
          accountType: role === 'expert' ? accountType : undefined,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || (isAr ? 'فشل إنشاء الحساب' : 'Failed to create account'))
        setLoading(false)
        return
      }

      // Show clear confirmation dialog / card that email has been sent
      setSuccessNotice({
        show: true,
        email,
        redirectTo: data.redirectTo || (role === 'expert' ? '/onboarding' : '/dashboard'),
      })
      setLoading(false)
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
          {successNotice?.show ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                <svg className="size-7" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-primary">
                {isAr ? 'تم إرسال رابط التفعيل!' : 'Check your inbox!'}
              </h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {isAr ? (
                  <>
                    لقد أرسلنا رسالة تأكيد إلى <strong className="text-primary">{successNotice.email}</strong>. يرجى فتح البريد الإلكتروني والنقر على رابط التفعيل.
                  </>
                ) : (
                  <>
                    We have sent a verification link to <strong className="text-primary">{successNotice.email}</strong>. Please check your email to activate your account.
                  </>
                )}
              </p>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-start text-[11px] text-amber-900 leading-relaxed">
                <p className="font-bold text-amber-950 mb-0.5">
                  {isAr ? '💡 لم تصلك الرسالة؟' : '💡 Did not receive the email?'}
                </p>
                <p>
                  {isAr
                    ? 'تحقق من مجلد الرسائل غير المرغوب فيها (Spam/Junk) أو انتظر دقيقة.'
                    : 'Check your Spam or Promotions folder if it doesn’t appear within a minute.'}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    router.push(successNotice.redirectTo)
                    router.refresh()
                  }}
                  className="w-full rounded-full bg-accent hover:bg-accent-hover py-3 text-xs font-bold text-primary shadow-xs transition"
                >
                  {role === 'expert'
                    ? (isAr ? 'متابعة إلى خطوة التحقق والإعداد ←' : 'Continue to Onboarding & ID Verification →')
                    : (isAr ? 'متابعة إلى لوحة التحكم ←' : 'Continue to Dashboard →')}
                </button>
              </div>
            </div>
          ) : (
            <>
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

                {/* Expert vs Organization sub-selector when role === 'expert' */}
                {role === 'expert' && (
                  <div>
                    <p className="text-xs font-bold text-primary mb-2">
                      {isAr ? 'نوع حساب مقدم الخدمة:' : 'Account Type:'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountType('expert')}
                        className={`rounded-xl border px-3 py-2 text-start text-xs font-bold transition ${
                          accountType === 'expert'
                            ? 'border-accent bg-secondary text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary'
                        }`}
                      >
                        {isAr ? 'خبير فردي (Individual)' : 'Individual Expert'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('organization')}
                        className={`rounded-xl border px-3 py-2 text-start text-xs font-bold transition ${
                          accountType === 'organization'
                            ? 'border-accent bg-secondary text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary'
                        }`}
                      >
                        {isAr ? 'مؤسسة / شركة (Organization)' : 'Organization'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Google Sign In Button */}
                <a
                  href={`/api/auth/google/signin?role=${role}`}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-surface px-4 py-3 text-xs font-bold text-primary hover:border-accent hover:bg-secondary/40 transition shadow-2xs mt-2"
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
                  <span>
                    {role === 'expert'
                      ? (isAr ? 'الانضمام كخبير باستخدام Google' : 'Sign up as Expert with Google')
                      : (isAr ? 'الانضمام كعميل باستخدام Google' : 'Sign up as Client with Google')}
                  </span>
                </a>

                <div className="relative my-2 text-center text-xs text-muted-foreground">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-surface px-3 text-[11px] uppercase font-bold text-muted-foreground">
                    {isAr ? 'أو بالبريد الإلكتروني' : 'or with email'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-primary">
                    {isAr ? 'الاسم الأول (First Name)' : 'First Name'}
                    <input
                      required
                      value={fName}
                      onChange={(e) => setFName(e.target.value)}
                      placeholder={isAr ? 'مثال: ليلى' : 'e.g. Layla'}
                      className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent"
                    />
                  </label>
                  <label className="text-xs font-bold text-primary">
                    {isAr ? 'اسم العائلة (Last Name)' : 'Last Name'}
                    <input
                      required
                      value={lName}
                      onChange={(e) => setLName(e.target.value)}
                      placeholder={isAr ? 'مثال: حسن' : 'e.g. Hassan'}
                      className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent"
                    />
                  </label>
                </div>

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
            </>
          )}
        </div>
      </div>
    </main>
  )
}
