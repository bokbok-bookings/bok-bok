'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'

export default function CheckoutPage() {
  const { isAr, localeHref } = useLanguage()
  const [paid, setPaid] = useState(false)

  return (
    <main className="min-h-screen bg-background px-5 text-foreground">
      <div className="mx-auto max-w-5xl pb-20">
        <div className="flex h-16 items-center justify-between border-b border-border">
          <Link
            href={localeHref('/experts')}
            className="text-xs font-bold text-primary hover:underline"
          >
            {isAr ? '← العودة لدليل الخبراء' : '← Back to directory'}
          </Link>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted-foreground border border-border">
            {isAr ? 'دفع آمن' : 'Secure checkout'}
          </span>
        </div>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_390px]">
          <section>
            <Link
              href={localeHref('/experts/layla-hassan')}
              className="inline-flex items-center text-xs font-bold text-primary hover:underline"
            >
              {isAr ? '← العودة لملف ليلى حسن' : "← Back to Layla's profile"}
            </Link>

            <p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">
              {isAr ? 'الخطوة ٢ من ٢' : 'Step 2 of 2'}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em] text-primary">
              {isAr ? 'إتمام الحجز' : 'Complete your booking'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAr
                ? 'يتم حجز موعدك مؤقتاً أثناء إتمام الدفع.'
                : 'Your session time is held while you complete payment.'}
            </p>

            <div className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
              <h2 className="text-base font-bold text-primary">
                {isAr ? 'تفاصيل الدفع' : 'Payment details'}
              </h2>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-1.5 text-xs font-bold text-primary">
                  {isAr ? 'رقم البطاقة' : 'Card number'}
                  <input
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-normal text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="4242 4242 4242 4242"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-bold text-primary">
                    {isAr ? 'تاريخ الانتهاء' : 'Expiry'}
                    <input
                      className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-normal text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      placeholder="MM / YY"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-primary">
                    {isAr ? 'رمز الأمان (CVC)' : 'CVC'}
                    <input
                      className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-normal text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      placeholder="123"
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-xs font-bold text-primary">
                  {isAr ? 'الاسم على البطاقة' : 'Name on card'}
                  <input
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-normal text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="Sara Ahmed"
                  />
                </label>
              </div>

              {paid ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800">
                  {isAr
                    ? 'تم تأكيد الدفع! تم إضافة موعدك مع ليلى حسن إلى تقويمك.'
                    : 'Payment confirmed! Your session with Layla Hassan has been added to your calendar.'}
                </div>
              ) : (
                <button
                  onClick={() => setPaid(true)}
                  className="mt-6 w-full rounded-full bg-accent px-5 py-3.5 text-sm font-bold text-primary transition hover:bg-accent-hover shadow-xs"
                >
                  {isAr ? 'تأكيد ودفع 750 ج.م' : 'Confirm and Pay 750 EGP'}
                </button>
              )}
            </div>
          </section>

          <aside className="h-fit rounded-3xl bg-primary p-7 text-white shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-white/50">
              {isAr ? 'ملخص الحجز' : 'Booking summary'}
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              {isAr ? 'جلسة استراتيجية المنتج' : 'Product strategy session'}
            </h2>
            <div className="mt-6 flex items-center gap-3 border-b border-white/10 pb-6">
              <div className="grid size-11 place-items-center rounded-2xl bg-accent text-sm font-bold text-primary">
                LH
              </div>
              <div>
                <p className="font-bold">{isAr ? 'ليلى حسن' : 'Layla Hassan'}</p>
                <p className="text-xs text-white/60">
                  {isAr ? 'غداً · ١١:٠٠ صباحاً · مكالمة فيديو ٤٥ دقيقة' : 'Tomorrow · 11:00 AM · 45 min Video call'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-white/65">
              <span>{isAr ? 'استشارة خبير' : 'Expert consultation'}</span>
              <span>750 {isAr ? 'ج.م' : 'EGP'}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-base font-bold">
              <span>{isAr ? 'المجموع المستحق' : 'Total due'}</span>
              <span>750 {isAr ? 'ج.م' : 'EGP'}</span>
            </div>
            <p className="mt-6 text-[11px] leading-5 text-white/55">
              {isAr
                ? 'إعادة جدولة أو إلغاء مجاني حتى 12 ساعة قبل موعد جلستك.'
                : 'Free reschedule or cancellation up to 12 hours before your session.'}
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
