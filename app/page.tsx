'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { BrandLogo } from '@/components/brand/logo'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import { VisionSection } from '@/components/home/vision-section'

const fallbackCategories = [
  {
    slug: 'marketing',
    image: '/categories/marketing.png',
    name: 'Marketing',
    nameAr: 'التسويق',
    description: 'Strategy, content, SEO, branding & campaign reviews',
    descriptionAr: 'استراتيجيات التسويق، المحتوى، تحسين محركات البحث ومراجعة الحملات',
    subCount: 8,
  },
  {
    slug: 'business-entrepreneurship',
    image: '/categories/business-entrepreneurship.png',
    name: 'Business & Entrepreneurship',
    nameAr: 'الأعمال وريادة الأعمال',
    description: 'Business planning, startup mentoring & sales strategy',
    descriptionAr: 'تخطيط الأعمال، إرشاد الشركات الناشئة واستراتيجيات المبيعات',
    subCount: 8,
  },
  {
    slug: 'technology-it',
    image: '/categories/technology-it.png',
    name: 'Technology & IT',
    nameAr: 'التكنولوجيا وتقنية المعلومات',
    description: 'Web, mobile, AI, data, architecture & code reviews',
    descriptionAr: 'تطوير الويب، التطبيقات، الذكاء الاصطناعي وهندسة البرمجيات',
    subCount: 9,
  },
  {
    slug: 'career-professional-development',
    image: '/categories/career-professional-development.png',
    name: 'Career & Professional Development',
    nameAr: 'التطوير المهني والوظيفي',
    description: 'CV review, interview prep, career planning & leadership',
    descriptionAr: 'مراجعة السيرة الذاتية، التحضير للمقابلات والتخطيط المهني',
    subCount: 9,
  },
  {
    slug: 'design-creative',
    image: '/categories/design-creative.png',
    name: 'Design & Creative',
    nameAr: 'التصميم والإبداع',
    description: 'UI/UX, visual identity, illustration, video & styling',
    descriptionAr: 'تصميم تجربة المستخدم، الهوية البصرية، والإنتاج المرئي',
    subCount: 10,
  },
  {
    slug: 'languages-communication',
    image: '/categories/languages-communication.png',
    name: 'Languages & Communication',
    nameAr: 'اللغات والتواصل',
    description: 'Conversation practice, business & presentation skills',
    descriptionAr: 'ممارسة المحادثة، التواصل المهني ومهارات العرض والتقديم',
    subCount: 5,
  },
  {
    slug: 'personal-skills-lifestyle',
    image: '/categories/personal-skills-lifestyle.png',
    name: 'Personal Skills & Lifestyle',
    nameAr: 'المهارات الشخصية وأسلوب الحياة',
    description: 'Time management, productivity & goal setting',
    descriptionAr: 'إدارة الوقت، الإنتاجية الشخصية وتحديد الأهداف',
    subCount: 5,
  },
  {
    slug: 'hobbies-skills',
    image: '/categories/hobbies-skills.png',
    name: 'Hobbies & Skills',
    nameAr: 'الهوايات والمهارات',
    description: 'Drawing, creative writing, music & photography basics',
    descriptionAr: 'الرسم، الكتابة الإبداعية، الموسيقى والتصوير الفوتوغرافي',
    subCount: 6,
  },
  {
    slug: 'travel',
    image: '/categories/travel.png',
    name: 'Travel',
    nameAr: 'السفر والترحال',
    description: 'Destination info, preparation & travel guidance',
    descriptionAr: 'إرشادات الوجهات، تجهيزات السفر والتخطيط العملي للرحلات',
    subCount: 3,
  },
]

const fallbackExperts = [
  { name: 'Ahmed Mohamed', slug: 'ahmed-mohamed', role: 'Marketing Consultant', location: 'Cairo, Egypt', initials: 'AM', image: '/experts/ahmed.png', color: 'bg-[#f2b58f]', rating: '4.9', reviews: '124', price: '500 EGP', next: 'Today, 8:00 PM', tags: ['Marketing', 'Growth'], featuredHome: true },
  { name: 'Layla Hassan', slug: 'layla-hassan', role: 'Product Strategy Expert', location: 'Dubai, UAE', initials: 'LH', image: '/experts/layla.png', color: 'bg-[#d4c7ee]', rating: '5.0', reviews: '89', price: '750 EGP', next: 'Tomorrow, 11:00 AM', tags: ['Product', 'Business'], featuredHome: true },
  { name: 'Omar Khalil', slug: 'omar-khalil', role: 'Career & Leadership Coach', location: 'Amman, Jordan', initials: 'OK', image: '/experts/omar.png', color: 'bg-[#b8d5c3]', rating: '4.8', reviews: '67', price: '400 EGP', next: 'Today, 6:30 PM', tags: ['Career', 'Leadership'], featuredHome: true },
]

export default function Page() {
  const { isAr, t, localeHref } = useLanguage()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [categoriesList, setCategoriesList] = useState<any[]>(fallbackCategories)
  const [homeExperts, setHomeExperts] = useState<any[]>(fallbackExperts)
  const categoriesCarouselRef = useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: 'next' | 'prev') => {
    if (!categoriesCarouselRef.current) return
    const container = categoriesCarouselRef.current
    const scrollAmount = container.clientWidth * 0.95
    const delta =
      direction === 'next'
        ? isAr
          ? -scrollAmount
          : scrollAmount
        : isAr
          ? scrollAmount
          : -scrollAmount
    container.scrollBy({ left: delta, behavior: 'smooth' })
  }

  // Fetch real featured & top approved experts from DB
  useEffect(() => {
    fetch('/api/experts')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const colors = [
            'bg-[#f2b58f]',
            'bg-[#d4c7ee]',
            'bg-[#b8d5c3]',
            'bg-[#ffe4a0]',
            'bg-[#c5e3f6]',
            'bg-[#ffd1c7]',
          ]
          const mapped = json.data.map((e: any, idx: number) => {
            const displayName =
              e.name ||
              `${e.fName || ''} ${e.lName || ''}`.trim() ||
              'Expert Specialist'
            const slug =
              e.slug ||
              displayName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            const tags =
              Array.isArray(e.tags) && e.tags.length > 0
                ? e.tags
                : [e.categorySlug || 'Guidance']

            return {
              name: displayName,
              slug,
              role: e.role || 'Verified Specialist',
              location: e.location || 'Cairo, Egypt',
              initials: displayName.substring(0, 2).toUpperCase(),
              image: e.avatarUrl || e.image || '/experts/ahmed.png',
              color: colors[idx % colors.length],
              rating: e.rating || '5.0',
              reviews: String(e.reviews || 0),
              price: e.price || '500 EGP',
              tags,
              featuredHome: Boolean(e.featuredHome),
            }
          })

          // Prioritize experts marked as featuredHome: true, then others
          const featured = mapped.filter((e: any) => e.featuredHome)
          const standard = mapped.filter((e: any) => !e.featuredHome)
          const combined = [...featured, ...standard]
          setHomeExperts(combined.slice(0, 6))
        }
      })
      .catch((err) => console.error('Failed to load featured home experts:', err))
  }, [])

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const formatted = json.data.map((c: any) => ({
            slug: c.slug,
            image: `/categories/${c.slug}.png`,
            name: c.name?.en || c.title?.en,
            nameAr: c.name?.ar || c.title?.ar,
            description: c.description?.en || 'Guidance from top experts in this field',
            descriptionAr: c.description?.ar || 'إرشاد مباشر من نخبة المتخصصين والخبراء',
            subCount: c.subcategories?.length || 0,
          }))
          setCategoriesList(formatted)
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))
  }, [])

  const filteredExperts = homeExperts.filter((expert) => {
    const matchesSearch =
      !search ||
      `${expert.name} ${expert.role} ${(expert.tags || []).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase())
    const matchesCategory =
      activeCategory === 'All' ||
      (expert.tags || []).some((t: string) =>
        activeCategory.toLowerCase().includes(t.toLowerCase())
      )
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        {/* Hero Section */}
        <section id="top" className="relative grid min-h-[550px] items-center gap-12 py-8 lg:grid-cols-[1fr_0.88fr] lg:gap-20 lg:py-12">
          <div className="relative z-10">
            <h1 className="max-w-[620px] text-[40px] sm:text-[54px] lg:text-[64px] font-semibold leading-[1.12] sm:leading-[1.05] tracking-[-0.05em] text-[#14243b]">
              {t.home.heroTitleLine1}<br />
              <span
                className="relative inline box-decoration-clone text-primary px-1 rounded-sm"
                style={{
                  backgroundImage:
                    'linear-gradient(to top, var(--accent, #FCAD35) 0%, var(--accent, #FCAD35) 100%)',
                  backgroundSize: '100% clamp(10px, 0.22em, 16px)',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '0 88%',
                  WebkitBoxDecorationBreak: 'clone',
                  boxDecorationBreak: 'clone',
                }}
              >
                {t.home.heroTitleLine2}
              </span>
            </h1>

            <p className="mt-6 max-w-[480px] text-[16px] sm:text-[17px] leading-relaxed text-muted-foreground">
              {t.home.heroSubtitle}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-5 sm:gap-7">
              <Link
                href={localeHref('/explore')}
                className="group inline-flex items-center gap-3 rounded-full bg-accent hover:bg-accent-hover px-6 py-3.5 text-sm font-bold text-primary shadow-xs transition-all hover:-translate-y-0.5"
              >
                {t.home.exploreAll}{' '}
                <ArrowRight
                  size={17}
                  className={`transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}
                />
              </Link>
              <Link
                href={localeHref('/consultations')}
                className="group relative inline-block text-sm font-bold text-primary transition-transform hover:-translate-y-0.5"
              >
                <span className="relative z-10">{t.home.consultations}</span>
                <span className="absolute bottom-0.5 left-0 w-full h-1 bg-accent -z-0 rounded-sm transition-all duration-200 group-hover:h-1 group-hover:bg-accent-hover" />
              </Link>
              <Link
                href={localeHref('/workshops')}
                className="group relative inline-block text-sm font-bold text-primary transition-transform hover:-translate-y-0.5"
              >
                <span className="relative z-10">{t.home.workshops}</span>
                <span className="absolute bottom-0.5 left-0 w-full h-1 bg-accent -z-0 rounded-sm transition-all duration-200 group-hover:h-1 group-hover:bg-accent-hover" />
              </Link>
              <Link
                href={localeHref('/webinars')}
                className="group relative inline-block text-sm font-bold text-primary transition-transform hover:-translate-y-0.5"
              >
                <span className="relative z-10">{t.home.webinars}</span>
                <span className="absolute bottom-0.5 left-0 w-full h-1 bg-accent -z-0 rounded-sm transition-all duration-200 group-hover:h-1 group-hover:bg-accent-hover" />
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-5 text-[12px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={17} className="text-primary" /> {t.home.adminReviewed}
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={17} className="text-primary" /> {t.home.verifiedSpecialists}
              </span>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[500px] items-center justify-center lg:max-w-[540px]">
            <Image
              src="/hero3.png"
              alt="Bok Bok Marketplace"
              width={996}
              height={941}
              priority
              className="h-auto w-full object-contain select-none"
            />
          </div>
        </section>

        {/* Vision Section */}
        <VisionSection />

        {/* Categories Section */}
        <section id="categories" className="border-t border-border py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl text-primary">
                {t.home.categoriesHeading}
              </h2>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary hover:underline"
              >
                {t.home.exploreAllCategories}{' '}
                <ArrowRight
                  size={15}
                  className={isAr ? 'rotate-180' : ''}
                />
              </Link>

              {/* Mobile Carousel Arrow Controls */}
              <div className="flex sm:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollCategories('prev')}
                  aria-label="Previous categories"
                  className="flex size-8 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-2xs hover:bg-muted active:scale-90 transition cursor-pointer"
                >
                  <ChevronLeft size={16} className={isAr ? 'rotate-180' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategories('next')}
                  aria-label="Next categories"
                  className="flex size-8 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-2xs hover:bg-muted active:scale-90 transition cursor-pointer"
                >
                  <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={categoriesCarouselRef}
            className="mt-8 sm:mt-10 flex overflow-x-auto scrollbar-none snap-x snap-mandatory gap-3 pb-3 pt-1 -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 sm:pt-0"
          >
            {categoriesList.map((c) => {
              const targetSlug = c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
              const displayName = isAr ? c.nameAr || c.name : c.name
              const displayDesc = isAr ? c.descriptionAr || c.description : c.description
              const imageSrc = c.image || `/categories/${targetSlug}.png`

              return (
                <Link
                  key={targetSlug}
                  href={localeHref(`/explore?category=${encodeURIComponent(targetSlug)}`)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-surface p-4 sm:p-7 min-h-[300px] sm:min-h-[350px] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-accent hover:bg-linear-to-b hover:from-white hover:to-secondary/20 w-[calc(50%-6px)] min-w-[calc(50%-6px)] max-w-[calc(50%-6px)] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:max-w-none sm:shrink"
                >
                  {/* Subtle decorative hover glow */}
                  <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-accent/15 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

                  <div>
                    {/* Centered Category Image */}
                    <div className="flex items-center justify-center pt-1 pb-1">
                      <div className="relative size-20 sm:size-28 overflow-hidden rounded-2xl sm:rounded-3xl border border-accent/25 bg-secondary/40 shadow-xs transition-all duration-300 group-hover:scale-105 group-hover:border-accent group-hover:shadow-md">
                        <Image
                          src={imageSrc}
                          alt={displayName}
                          fill
                          sizes="(max-width: 640px) 80px, 112px"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    </div>

                    {/* Title & Animated Arrow */}
                    <h3 className="mt-3.5 sm:mt-4 text-sm sm:text-lg font-bold text-foreground transition-colors group-hover:text-primary flex items-center justify-center gap-1.5 text-center leading-snug">
                      <span>{displayName}</span>
                      <ArrowRight
                        size={16}
                        className={`text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 shrink-0 hidden sm:inline-block ${isAr
                          ? 'rotate-180 translate-x-1 group-hover:translate-x-0'
                          : '-translate-x-1 group-hover:translate-x-0'
                          }`}
                      />
                    </h3>

                    {/* Description - fully shown without truncation */}
                    <p className="mt-2 text-center text-[11px] sm:text-xs leading-relaxed text-muted-foreground">
                      {displayDesc}
                    </p>
                  </div>

                  {/* Bottom Footer Row */}
                  <div className="mt-2 sm:mt-3 flex items-center justify-center w-full border-t border-border pt-3 sm:pt-4">
                    {/* <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground transition-colors group-hover:text-primary truncate">
                          <span className="size-1.5 rounded-full bg-accent shrink-0" />
                          <span>{c.subCount ?? 8}</span>
                          <span className="hidden xs:inline">{t.home.specializations}</span>
                        </span> */}
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-primary group-hover:text-accent-hover transition-colors shrink-0">
                      <span className="hidden sm:inline">{t.home.exploreOfferings} </span>
                      <span className="text-xs">{isAr ? '←' : '→'}</span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>



        {/* How It Works Section */}
        <section id="how-it-works" className="rounded-[36px] bg-[#14243b] px-7 py-14 text-white sm:px-12 sm:py-16">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.17em] text-accent">
                {isAr ? 'بكل بساطة ووضوح' : 'Simple by design'}
              </p>
              <h2 className="mt-4 max-w-md text-3xl sm:text-4xl font-semibold leading-tight tracking-[-.05em]">
                {t.home.howItWorksHeading}
              </h2>
              <Link
                href={localeHref('/how-it-works')}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
              >
                {t.home.howItWorksLink}{' '}
                <ArrowRight
                  size={14}
                  className={isAr ? 'rotate-180' : ''}
                />
              </Link>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {(isAr
                ? [
                  ['01', 'اختر خبيرك المعتمد', 'تصفح قائمة المختصين الموثوقين عبر 9 مجالات معتمدة.'],
                  ['02', 'حدد النموذج والموعد', 'اختر استشارة فردية، ورشة عمل، أو ندوة تناسب وقتك.'],
                  ['03', 'احجز بكل طمأنينة', 'عروض مراجعة بدقة مع نطاق عمل واضح ودعم مستمر.'],
                ]
                : [
                  ['01', 'Find your expert', 'Browse verified specialists across 9 approved categories.'],
                  ['02', 'Choose a format & time', 'Pick a consultation, workshop, or webinar that fits your schedule.'],
                  ['03', 'Book with confidence', 'Admin-reviewed offers with clear scope and guidance.'],
                ]
              ).map(([number, title, text]) => (
                <div key={number} className="border-t border-white/20 pt-4">
                  <p className="text-sm font-bold text-accent">{number}</p>
                  <p className="mt-4 font-bold">{title}</p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-[#b9c2ce]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Experts Section */}
        <section id="experts" className="py-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.17em] text-muted-foreground">
                {isAr ? 'شخصيات ملهمة' : 'People worth meeting'}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl text-primary">
                {t.home.featuredExpertsHeading}
              </h2>
            </div>
            <Link
              href={localeHref('/experts')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              {t.home.viewAllExperts}{' '}
              <ArrowRight
                size={14}
                className={isAr ? 'rotate-180' : ''}
              />
            </Link>
          </div>

          {/* <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:p-2">
            <div className="flex flex-1 items-center gap-3 px-3">
              <Search size={18} className="text-muted-foreground" />
              <input
                aria-label="Search experts"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.experts.searchPlaceholder}
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div> */}

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {filteredExperts.map((expert) => (
              <Link
                key={expert.slug || expert.name}
                href={localeHref(`/experts/${expert.slug || expert.name.toLowerCase().replaceAll(' ', '-')}`)}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-accent hover:shadow-lg cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className={`relative size-14 shrink-0 overflow-hidden rounded-2xl ${expert.color}`}>
                      <Image
                        src={expert.image}
                        alt={`${expert.name} portrait`}
                        fill
                        sizes="56px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {expert.featuredHome && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-1 text-[10px] font-bold text-amber-900 shadow-2xs">
                          ⭐ {isAr ? 'مميز' : 'Featured'}
                        </span>
                      )}
                      {Number((expert as any).reviews ?? 0) > 0 && Number(expert.rating) > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
                          <Star size={12} className="text-accent fill-accent" /> {expert.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-5 font-bold text-primary group-hover:text-primary transition-colors">{expert.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{expert.role}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">{expert.location}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(expert.tags || []).map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary/80 border border-accent/20 px-2.5 py-1 text-[10px] font-bold text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary group-hover:text-primary transition-colors">
                    {t.home.viewProfile}
                  </span>
                  <span className="grid size-7 place-items-center rounded-full bg-accent text-primary transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 shadow-xs">
                    <span className="text-xs font-bold leading-none">{isAr ? '←' : '→'}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {filteredExperts.length === 0 && (
            <div className="mt-8 rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              {t.home.noExpertsFound}
            </div>
          )}
        </section>

        {/* Bottom CTA Banner */}
        <section
          id="become-expert"
          className="mb-16 flex flex-col gap-7 rounded-[36px] bg-secondary border border-accent/30 px-7 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[.17em] text-muted-foreground">
              {t.home.becomeExpertTag}
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-.04em] text-primary">
              {t.home.becomeExpertHeading}
            </h2>
          </div>
          <Link
            href={localeHref('/signup')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent hover:bg-accent-hover px-6 py-3.5 text-sm font-bold text-primary shadow-xs transition"
          >
            {t.home.becomeExpertBtn}{' '}
            <ArrowRight
              size={17}
              className={isAr ? 'rotate-180' : ''}
            />
          </Link>
        </section>
      </div>
    </main>
  )
}
