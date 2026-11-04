'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { BokBok, withBokBok } from '@/components/brand/bok-bok'
import {
  Compass,
  Calendar,
  CreditCard,
  Video,
  ShieldCheck,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Briefcase,
  GraduationCap,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'

export default function HowItWorksPage() {
  const { isAr, t, localeHref } = useLanguage()
  const [activeAudience, setActiveAudience] = useState<'clients' | 'experts'>('clients')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const clientSteps = isAr
    ? [
      {
        num: '01',
        title: 'ابحث عن الخبير والعرض المناسب',
        desc: 'استكشف نخبة المتخصصين المعتمدين في 9 مجالات رئيسية تشمل التسويق، الأعمال، التقنية، المسار المهني، والتصميم. اختر بين الاستشارات أو ورش العمل أو الندوات.',
        icon: Compass,
        highlight: '9 مجالات معتمدة',
      },
      {
        num: '02',
        title: 'حدد التاريخ والموعد المتاح',
        desc: 'تصفح التقويم المباشر للخبير واختر الموعد الأنسب لجدولك دون الحاجة للمراسلات المطولة، مع مدة جلسة تتناسب مع احتياجاتك.',
        icon: Calendar,
        highlight: 'مواعيد حية مباشرة',
      },
      {
        num: '03',
        title: 'تأكيد فوري ودفع آمن عبر إنستاباي',
        desc: 'قم بالتحويل عبر تطبيق إنستاباي أو بنكك المعتمد، وارفع إيصال التحويل ليتم تأكيد الحجز فوراً وإرسال دعوة التقويم ورابط الجلسة إلى بريدك.',
        icon: CreditCard,
        highlight: 'تأكيد موثوق وفوري',
      },
      {
        num: '04',
        title: 'التقِ بالخبير واخرج بخطة عمل واضحة',
        desc: 'احضر جلستك عبر الفيديو المباشر أو حضورياً. احصل على توجيه مخصص وحلول عملية وخطة تنفيذية تدفعك للأمام.',
        icon: Video,
        highlight: 'مخرجات عملية قابلة للتطبيق',
      },
    ]
    : [
      {
        num: '01',
        title: 'Find the Right Expert & Offering',
        desc: 'Explore vetted specialists across 9 approved MVP categories including Marketing, Business, Technology, Career, and Design. Filter by consultation, workshop, or webinar.',
        icon: Compass,
        highlight: '9 Approved Categories',
      },
      {
        num: '02',
        title: 'Pick a Date & Time Slot',
        desc: 'Browse real-time expert availability with zero email back-and-forth. Select session lengths that fit your need — from a 45-min consultation to interactive group cohorts.',
        icon: Calendar,
        highlight: 'Direct live calendar',
      },
      {
        num: '03',
        title: 'Quick InstaPay Confirmation',
        desc: 'Transfer directly using InstaPay or your banking app, upload the transfer receipt, and your appointment will be verified with calendar invites sent to your inbox.',
        icon: CreditCard,
        highlight: 'Secure verification',
      },
      {
        num: '04',
        title: 'Meet & Leave With a Concrete Plan',
        desc: 'Connect over online video or in-person. Walk away with clear recommendations, practical guidance, and a concrete roadmap for your next breakthrough.',
        icon: Video,
        highlight: 'Actionable outcomes',
      },
    ]

  const expertSteps = isAr
    ? [
      {
        num: '01',
        title: 'أنشئ باقاتك وعروضك المعتمدة',
        desc: 'حوّل خبراتك العملية إلى استشارات فردية أو ورش عمل تفاعلية أو ندوات تدريبية تقع ضمن التصنيفات المعتمدة للمنصة مع توضيح الفئة المستهدفة ونطاق الجلسة.',
        icon: Briefcase,
        highlight: 'جودة مراجعة وموثوقة',
      },
      {
        num: '02',
        title: 'اضبط جدول أوقاتك الأسبوعية',
        desc: 'حدد ساعات عملك المتاحة، فترات الاستراحة التلقائية بين الجلسات، واستمتع بإمكانية التعديل السريع متى تغير جدول مواعيدك.',
        icon: Clock,
        highlight: 'تنظيم تلقائي ومريح',
      },
      {
        num: '03',
        title: 'استقبل طلبات مؤكدة مسبقاً',
        desc: 'كل طلب يصلك مرفق معه إيصال دفع حقيقي ومسبق عبر إنستاباي. لا حاجة لملاحقة المستحقات أو القلق من الإلغاء المفاجئ.',
        icon: ShieldCheck,
        highlight: 'دفع مؤكد بنقرة واحدة',
      },
      {
        num: '04',
        title: 'قدّم أثراً حقيقياً وابنِ سمعتك المهنية',
        desc: 'قدّم جلساتك بكفاءة، واحصل على تقييمات موثقة من عملائك، وشارك رابط ملفك المخصص مباشرة على منصات التواصل.',
        icon: Sparkles,
        highlight: 'روابط مخصصة للمشاركة',
      },
    ]
    : [
      {
        num: '01',
        title: 'Build Your Offer Catalog',
        desc: 'Package what you know into 1-on-1 consultations, hands-on workshops, or masterclass webinars within the approved MVP taxonomy, with clear scope and audience.',
        icon: Briefcase,
        highlight: 'Admin-reviewed quality',
      },
      {
        num: '02',
        title: 'Set Your Weekly Availability',
        desc: 'Define your working hours, recurring lunch breaks, and automated buffers between calls. Add one-click date overrides whenever your schedule changes.',
        icon: Clock,
        highlight: 'Automated buffers',
      },
      {
        num: '03',
        title: 'Receive Pre-Paid Requests',
        desc: 'Every incoming request comes with an attached InstaPay receipt. No chasing payments or unpaid cancellations — review transfers and approve with one tap.',
        icon: ShieldCheck,
        highlight: 'Zero payment chasing',
      },
      {
        num: '04',
        title: 'Deliver Impact & Build Reputation',
        desc: 'Conduct your sessions, earn verified client reviews, share your dedicated offer slugs directly on social media, and grow your advisory practice.',
        icon: Sparkles,
        highlight: 'Shareable links by slug',
      },
    ]

  const offeringFormats = [
    {
      title: t.howItWorks.consultationTitle,
      desc: t.howItWorks.consultationDesc,
      icon: Sparkles,
      link: '/consultations',
      cta: t.howItWorks.consultationCta,
    },
    {
      title: t.howItWorks.workshopTitle,
      desc: t.howItWorks.workshopDesc,
      icon: GraduationCap,
      link: '/workshops',
      cta: t.howItWorks.workshopCta,
    },
    {
      title: t.howItWorks.webinarTitle,
      desc: t.howItWorks.webinarDesc,
      icon: Users,
      link: '/webinars',
      cta: t.howItWorks.webinarCta,
    },
  ]

  const faqs = isAr
    ? [
      {
        q: 'كيف يتم التحقق من الخبراء ومراجعة العروض في بوك بوك؟',
        a: 'يخضع كل خبير للتحقق من الهوية والأعمال السابقة، وتخضع كل جلسة لمراجعة إدارية مسبقة للتأكد من وضوح الفئة المستهدفة ونطاق الجلسة قبل نشرها على المنصة.',
      },
      {
        q: 'ما هي أنواع العروض المتاحة على المنصة؟',
        a: 'تركز منصة بوك بوك على الاستشارات الفردية، ورش العمل التفاعلية، والندوات المباشرة عبر 9 مجالات معتمدة (التسويق، الأعمال وريادة الأعمال، التقنية، التطوير المهني، التصميم والإبداع، اللغات، المهارات الشخصية، الهوايات، والسفر).',
      },
      {
        q: 'من يمكنه الاستفادة أو تقديم الجلسات على بوك بوك؟',
        a: 'صُممت منصة بوك بوك للمهنيين والمستفيدين الباحثين عن إرشاد عملي موثوق من أصحاب التجارب الحقيقية، مع استبعاد الدروس الخصوصية المدرسية أو كتابة الأبحاث الأكاديمية.',
      },
      {
        q: 'كيف تعمل آلية الدفع عبر إنستاباي؟',
        a: 'عند اختيارك للموعد أو المقعد المناسب، يظهر عنوان حساب إنستاباي الرسمي لبوك بوك. تقوم بالتحويل من تطبيق بنكك أو إنستاباي، وترفع لقطة شاشة للإيصال ليتم مراجعته وتأكيد موعدك.',
      },
      {
        q: 'هل يمكن حجز جلسات تتجاوز الساعة الواحدة؟',
        a: 'نعم! تدعم المنصة جلسات تدريبية واستشارية متعددة الساعات (حتى 4 ساعات) مع فترات راحة تلقائية بين الجلسات لضمان أقصى استفادة.',
      },
      {
        q: 'ماذا لو احتجت لإعادة جدولة موعد الجلسة؟',
        a: 'يمكنك طلب إعادة الجدولة بسهولة من خلال رابط بريد التأكيد حتى 24 ساعة قبل موعد الجلسة، ليقوم الخبير بتعيين موعد بديل مناسب في جدوله.',
      },
    ]
    : [
      {
        q: 'How are Bok Bok experts and offers reviewed?',
        a: 'Every expert undergoes identity and portfolio verification, and every offer requires administrator review before publication. Structured vocational training programmes are additionally flagged for a separate licensing review before publication.',
      },
      {
        q: 'What offerings are included in the Bok Bok MVP?',
        a: 'Bok Bok is a marketplace for Consultations, Workshops, and Webinars across 9 approved categories (Marketing, Business & Entrepreneurship, Technology & IT, Career & Professional Development, Design & Creative, Languages & Communication, Personal Skills & Lifestyle, Hobbies & Skills, and Travel). Professional Services and regulated medical, legal, financial, or school tutoring services are outside the MVP.',
      },
      {
        q: 'Who can book or offer sessions on Bok Bok?',
        a: 'Bok Bok connects ambitious individuals with vetted specialists across 9 approved MVP categories. Services directed at school tutoring, university exam preparation, or academic ghostwriting are excluded from the platform.',
      },
      {
        q: 'How does payment with InstaPay work?',
        a: 'When you choose a slot or ticket, you will see the official Bok Bok InstaPay address. Make the transfer from your banking app or InstaPay, upload a screenshot or PDF receipt, and our verification team approves your booking.',
      },
      {
        q: 'Can sessions be scheduled for longer than 1 hour?',
        a: 'Yes! Bok Bok supports multi-hour sessions (up to 4 hours) with automated break buffers so experts can deliver comprehensive workshops or deep-dive consultations.',
      },
      {
        q: 'What if I need to reschedule?',
        a: 'You can request a reschedule through your confirmation email up to 24 hours before the scheduled time slot, allowing the expert to re-assign an alternative slot on their live calendar.',
      },
    ]

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative border-b border-border bg-surface py-8 sm:py-10">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-primary max-w-3xl mx-auto leading-tight">
            {isAr ? 'كيف تعمل منصة ' : 'How '}
            <span className="font-heading text-primary">Bok Bok</span>
            {isAr ? '' : ' Works'}
          </h1>

          <p className="mt-3 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t.howItWorks.subtitle}
          </p>

          {/* Audience Switcher */}
          <div className="mt-6 inline-flex rounded-full bg-[#f4f2ee] p-1.5 border border-border">
            <button
              type="button"
              onClick={() => setActiveAudience('clients')}
              className={`rounded-full px-6 py-2.5 text-xs font-bold transition ${activeAudience === 'clients'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-primary'
                }`}
            >
              {t.howItWorks.forClients}
            </button>
            <button
              type="button"
              onClick={() => setActiveAudience('experts')}
              className={`rounded-full px-6 py-2.5 text-xs font-bold transition ${activeAudience === 'experts'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-primary'
                }`}
            >
              {t.howItWorks.forExperts}
            </button>
          </div>
        </div>
      </section>

      {/* 4-Step Interactive Journey */}
      <section className="py-20">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {activeAudience === 'clients' ? t.howItWorks.clientJourney : t.howItWorks.expertFlow}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">
              {activeAudience === 'clients'
                ? isAr
                  ? 'خطواتك من السؤال إلى الحل المباشر'
                  : 'Your path from question to breakthrough'
                : isAr
                  ? 'قدّم استشاراتك وأدر حجوزاتك بكل سهولة'
                  : 'Monetize and manage your advisory with ease'}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(activeAudience === 'clients' ? clientSteps : expertSteps).map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.num}
                  className="relative rounded-3xl border border-border bg-surface p-7 transition hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-3xl font-black text-accent">{step.num}</span>
                      <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                        <Icon size={22} />
                      </div>
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                      {step.highlight}
                    </span>
                    <h3 className="text-base font-bold text-primary mb-2">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3 MVP Formats Section */}
      <section className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {t.howItWorks.threeFormatsHeading}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">
              {isAr ? 'اختر النموذج الذي يناسب أهدافك' : 'Choose the format that fits your goals'}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {t.howItWorks.threeFormatsSubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {offeringFormats.map((fmt) => {
              const Icon = fmt.icon
              return (
                <div
                  key={fmt.title}
                  className="group rounded-3xl border border-border bg-surface p-7 text-center flex flex-col items-center justify-between transition-all duration-300 hover:-translate-y-1.5 hover:border-accent hover:shadow-xl hover:bg-linear-to-b hover:from-white hover:to-secondary/20"
                >
                  <div className="flex flex-col items-center">
                    <span className="grid size-14 place-items-center rounded-2xl bg-secondary border border-accent/25 text-primary transition-all duration-300 group-hover:bg-accent group-hover:scale-105 group-hover:shadow-xs mb-4">
                      <Icon size={24} className="transition-transform duration-300 group-hover:rotate-3" />
                    </span>
                    <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {fmt.title}
                    </h3>
                    <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-3 min-h-9 max-w-xs">
                      {fmt.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border w-full flex justify-center">
                    <Link
                      href={localeHref(fmt.link)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-accent-hover transition-colors"
                    >
                      {fmt.cta}{' '}
                      <ArrowRight
                        size={13}
                        className={`transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}
                      />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Banner */}
      <section className="py-20">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
          <div className="rounded-[36px] bg-[#14243b] px-8 py-14 text-white sm:px-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  {isAr ? 'معايير الجودة في بوك بوك' : <>The <BokBok /> Standard</>}
                </p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  {isAr
                    ? 'منصة مبنية على التحقق الدقيق والنتائج الملموسة.'
                    : 'Built on verification, clear scope, and tangible progress.'}
                </h2>
                <p className="mt-4 text-xs text-[#b9c2ce] leading-relaxed">
                  {isAr
                    ? 'صممنا بوك بوك لنستبدل المنصات العشوائية بجلسات وورش عمل مركزة ومراجعة بدقة، حيث يكون لكل دقيقة قيمتها.'
                    : 'We built Bok Bok to eliminate noisy marketplaces and replace them with focused, admin-reviewed consultations, workshops, and webinars where every minute counts.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(isAr
                  ? [
                    {
                      title: 'عروض مراجعة ومعتمدة',
                      text: 'تتطلب كل جلسة وصفاً واضحاً للنشاط، الفئة المستهدفة، وموافقة مسبقة من الإدارة.',
                    },
                    {
                      title: 'مواعيد حية مؤكدة',
                      text: 'حجز مباشر ومؤكد عبر التقويم التلقائي بمجرد مراجعة إيصال التحويل.',
                    },
                    {
                      title: 'تصنيفات محددة بدقة',
                      text: 'منظمة عبر 9 مجالات رئيسية و63 تخصصاً فرعياً معتمداً.',
                    },
                    {
                      title: 'أثر مهني ومعرفي',
                      text: 'صممت الجلسات لتطوير المهارات العملية والارتقاء بمسارك وأعمالك.',
                    },
                  ]
                  : [
                    {
                      title: 'Admin-Reviewed Offers',
                      text: 'Every offer requires a clear activity description, intended audience, and admin approval.',
                    },
                    {
                      title: 'Guaranteed Availability',
                      text: 'Direct slots locked upon receipt verification with automated calendar sync.',
                    },
                    {
                      title: 'Approved Taxonomy',
                      text: 'Curated across 9 MVP categories and 63 specialized subcategories.',
                    },
                    {
                      title: 'Professional Learning Scope',
                      text: 'All sessions are designed for skills, career advancement, and personal development.',
                    },
                  ]
                ).map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                    <CheckCircle2 size={18} className="text-accent mb-2" />
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <p className="mt-1 text-xs text-[#b9c2ce] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
              <HelpCircle size={15} /> {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-primary">
              {isAr ? 'كل ما تحتاج معرفته عن المنصة' : 'Everything you need to know'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-border bg-background overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-5 text-start font-bold text-sm text-primary"
                  >
                    <span>{withBokBok(faq.q)}</span>
                    <ChevronDown
                      size={17}
                      className={`text-muted-foreground transition-transform duration-200 shrink-0 ${isAr ? 'mr-4' : 'ml-4'} ${isOpen ? 'rotate-180 text-primary' : ''
                        }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border">
                      {withBokBok(faq.a)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
          <div className="rounded-[36px] bg-secondary border border-accent/30 p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {isAr ? 'هل أنت مستعد لخطوتك القادمة؟' : 'Ready to take the next step?'}
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-primary">
                {isAr ? 'احجز جلستك الآن أو شارك خبراتك مع الآخرين.' : 'Book a session or share your expertise.'}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAr
                  ? 'انضم للرواد والمهنيين والمبدعين الذين يطورون مهاراتهم عبر استشارات وورش عمل وندوات مباشرة.'
                  : 'Join founders, engineers, and creators leveling up through direct consultations, workshops, and webinars.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <Link
                href="/explore"
                className="rounded-full bg-accent px-6 py-3.5 text-xs font-bold text-primary shadow-md hover:bg-accent-hover transition"
              >
                {t.home.exploreAll}
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-border bg-surface px-6 py-3.5 text-xs font-bold text-primary hover:border-primary transition"
              >
                {t.footer.applyAsExpert}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
