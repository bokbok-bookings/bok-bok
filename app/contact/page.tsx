'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  MessageSquareHeart,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'

function InstagramIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

const INSTAGRAM_URL = 'https://www.instagram.com/bokbok.bookings/'
const CONTACT_EMAIL = 'bokbok.bookings@gmail.com'

type TopicKey = 'recommendation' | 'opinion' | 'expert_suggestion' | 'support' | 'other'

export default function ContactPage() {
  const { isAr, localeHref } = useLanguage()

  const [topic, setTopic] = useState<TopicKey>('recommendation')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const topics: Array<{ key: TopicKey; labelEn: string; labelAr: string }> = [
    { key: 'recommendation', labelEn: 'Recommendation', labelAr: 'اقتراح / توصية' },
    { key: 'opinion', labelEn: 'Opinion & Feedback', labelAr: 'رأيك في بوك بوك' },
    { key: 'expert_suggestion', labelEn: 'Suggest an Expert / Topic', labelAr: 'اقتراح خبير أو مجال' },
    { key: 'support', labelEn: 'Support & Inquiry', labelAr: 'دعم واستفسار' },
    { key: 'other', labelEn: 'Other', labelAr: 'أخرى' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          name,
          email,
          phone,
          subject,
          message,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSubmitted(true)
        setSubject('')
        setMessage('')
      } else {
        setError(
          json.error ||
          (isAr ? 'تعذر إرسال رسالتك، يرجى المحاولة مرة أخرى.' : 'Failed to send your message. Please try again.'),
        )
      }
    } catch (err: any) {
      setError(
        err?.message ||
        (isAr ? 'حدث خطأ في الاتصال بالخادم.' : 'Network error while sending your message.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16 space-y-10">
        {/* Hero Header */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary border border-accent/30 px-3.5 py-1.5 text-xs font-bold text-primary">
            <MessageSquareHeart size={14} className="text-primary" />
            <span>{isAr ? 'نسمعك دائماً' : 'We Value Your Voice'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
            {isAr
              ? 'تواصل معنا · الآراء والاقتراحات'
              : 'Contact Us · Opinions & Recommendations'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isAr
              ? 'هل لديك اقتراح لتطوير بوك بوك، أو رأي تود مشاركته، أو خبير ومجال تتمنى وجوده على المنصة؟ أرسل لنا رسالتك مباشرة وسيتواصل معك فريقنا.'
              : 'Have a recommendation to make Bok Bok better, an opinion to share, or an expert or topic you would love to see on the platform? Send us a message directly.'}
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-5 items-start">
          {/* Contact Info & Social Column */}
          <aside className="lg:col-span-2 space-y-4">
            {/* Instagram Card */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-3xl border border-border bg-surface p-6 shadow-xs hover:border-accent transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary border border-accent/30">
                  <InstagramIcon size={22} />
                </div>
                <ArrowUpRight
                  size={18}
                  className="text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isAr ? 'تابعنا على إنستجرام' : 'Follow Us on Instagram'}
                </p>
                <p className="text-base font-bold text-primary mt-0.5">@bokbok.bookings</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {isAr
                    ? 'تابع أحدث الندوات وورش العمل ونصائح الخبراء وتواصل معنا عبر الرسائل.'
                    : 'Stay updated with upcoming workshops, webinars, expert insights, and direct updates.'}
                </p>
              </div>
            </a>

            {/* Direct Email Card */}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="group block rounded-3xl border border-border bg-surface p-6 shadow-xs hover:border-accent transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary border border-border">
                  <Mail size={20} />
                </div>
                <ArrowUpRight
                  size={18}
                  className="text-muted-foreground group-hover:text-primary transition"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isAr ? 'البريد الإلكتروني المباشر' : 'Direct Email'}
                </p>
                <p className="text-sm font-bold text-primary mt-0.5 break-all">{CONTACT_EMAIL}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {isAr
                    ? 'جميع الرسائل والاقتراحات من هذا النموذج تصل مباشرة إلى بريد فريق بوك بوك.'
                    : 'All messages submitted through this form go straight to the Bok Bok team inbox.'}
                </p>
              </div>
            </a>

            {/* Tips Card */}
            <div className="rounded-3xl border border-border bg-secondary/40 p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span>{isAr ? 'كيف تساعدنا اقتراحاتك؟' : 'How Your Feedback Helps'}</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>
                  •{' '}
                  {isAr
                    ? 'اقتراح مجالات وخبراء جدد تبحث عنهم.'
                    : 'Suggesting new experts, topics, or workshop formats you want.'}
                </li>
                <li>
                  •{' '}
                  {isAr
                    ? 'مشاركة رأيك بصراحة لتحسين تجربة الحجز والجلسات.'
                    : 'Sharing honest opinions to improve booking and session experience.'}
                </li>
                <li>
                  •{' '}
                  {isAr
                    ? 'اقتراح مزايا جديدة تسهل رحلتك على بوك بوك.'
                    : 'Requesting new platform features that make your journey easier.'}
                </li>
              </ul>
            </div>
          </aside>

          {/* Form Column */}
          <section className="lg:col-span-3 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
            {submitted ? (
              <div className="py-10 text-center space-y-4">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle size={28} />
                </div>
                <h2 className="text-xl font-bold text-primary">
                  {isAr ? 'شكراً لك! تم إرسال رسالتك بنجاح' : 'Thank You! Your Message Has Been Sent'}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? 'وصلت رسالتك إلى فريق بوك بوك (bokbok.bookings@gmail.com). نقدّر وقتك ورأيك وسنرد عليك في أقرب وقت ممكن.'
                    : 'Your message has been delivered to the Bok Bok team (bokbok.bookings@gmail.com). We truly appreciate your feedback and will get back to you soon.'}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="rounded-full bg-accent hover:bg-accent-hover px-6 py-2.5 text-xs font-bold text-primary transition shadow-xs"
                  >
                    {isAr ? 'إرسال رسالة أخرى' : 'Send Another Message'}
                  </button>
                  <Link
                    href={localeHref('/explore')}
                    className="rounded-full border border-border bg-background hover:bg-secondary/60 px-6 py-2.5 text-xs font-bold text-primary transition"
                  >
                    {isAr ? 'تصفح الخدمات والخبراء' : 'Explore Services'}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold text-primary">
                    {isAr ? 'أرسل لنا رأيك أو اقتراحك' : 'Share Your Recommendation or Opinion'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr
                      ? 'املأ البيانات أدناه وسنستلم رسالتك فوراً.'
                      : 'Fill in the details below and we will receive your message right away.'}
                  </p>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs font-semibold text-rose-800">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Topic Selector */}
                <div>
                  <label className="block text-xs font-bold text-primary mb-2">
                    {isAr ? 'نوع الرسالة' : 'Message Category'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((item) => {
                      const active = topic === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setTopic(item.key)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition border ${active
                              ? 'bg-primary text-white border-primary shadow-2xs'
                              : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
                            }`}
                        >
                          {isAr ? item.labelAr : item.labelEn}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5">
                      {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder={isAr ? 'اكتب اسمك...' : 'Your name'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5">
                      {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={160}
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5">
                      {isAr ? 'رقم الهاتف / واتساب (اختياري)' : 'Phone / WhatsApp (Optional)'}
                    </label>
                    <input
                      type="tel"
                      maxLength={40}
                      placeholder={isAr ? 'مثال: 010xxxxxxxx' : 'e.g. +20 10...'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5">
                      {isAr ? 'عنوان الرسالة (اختياري)' : 'Subject (Optional)'}
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      placeholder={
                        isAr ? 'مثال: اقتراح ميزة جديدة...' : 'e.g. Suggestion for new feature...'
                      }
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    {isAr ? 'رسالتك / اقتراحك / رأيك *' : 'Your Message / Recommendation / Opinion *'}
                  </label>
                  <textarea
                    rows={5}
                    required
                    minLength={10}
                    maxLength={3000}
                    placeholder={
                      isAr
                        ? 'اكتب تفاصيل رأيك أو اقتراحك هنا بكل صراحة...'
                        : 'Share your thoughts, recommendations, or ideas with us...'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground outline-none focus:border-accent resize-y"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-muted-foreground">
                    {isAr
                      ? 'تُرسل الرسالة مباشرة إلى bokbok.bookings@gmail.com'
                      : 'Sent directly to bokbok.bookings@gmail.com'}
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent hover:bg-accent-hover px-7 py-3 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>
                      {submitting
                        ? isAr
                          ? 'جاري الإرسال...'
                          : 'Sending...'
                        : isAr
                          ? 'إرسال الرسالة'
                          : 'Send Message'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
