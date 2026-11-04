'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BokBok } from '@/components/brand/bok-bok'
import { useLanguage } from '@/lib/i18n/language-context'

const NAVY = '#142D4E'
const GOLD = '#FCAD35'

// Merge point where all expert paths converge into the golden path
const MERGE = { x: 310, y: 155 }
const CUSTOMER = { x: 470, y: 155 }

// Expert nodes on the left side of the visual
const EXPERT_NODES = [
  { x: 50, y: 45 },
  { x: 75, y: 100 },
  { x: 45, y: 155 },
  { x: 75, y: 210 },
  { x: 50, y: 265 },
]

function expertPath(x: number, y: number) {
  const startX = x + 18
  return `M ${startX} ${y} C ${startX + 105} ${y}, ${MERGE.x - 90} ${MERGE.y}, ${MERGE.x} ${MERGE.y}`
}

/** Simple person glyph (head + shoulders), mirror-safe for RTL. */
function PersonNode({
  cx,
  cy,
  r,
  fill,
  stroke,
  glyph,
}: {
  cx: number
  cy: number
  r: number
  fill: string
  stroke: string
  glyph: string
}) {
  const s = r / 20
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={3} />
      <circle cx={cx} cy={cy - 5 * s} r={5.5 * s} fill={glyph} />
      <path
        d={`M${cx - 9 * s} ${cy + 11 * s} a ${9 * s} ${8 * s} 0 0 1 ${18 * s} 0 Z`}
        fill={glyph}
      />
    </g>
  )
}

export function VisionSection() {
  const { isAr, localeHref } = useLanguage()

  return (
    <section id="vision" className="border-t border-border py-20">
      <div className="mx-auto max-w-4xl flex flex-col items-center text-center px-4">
        {/* Eyebrow Label */}
        <p className="text-xs font-bold uppercase tracking-[.18em] text-primary/70">
          {isAr ? 'رؤيتنا' : 'Our vision'}
        </p>

        {/* Central Quote Headline */}
        <blockquote className="relative mt-5 max-w-3xl">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 text-[100px] leading-none font-serif text-accent/30 select-none"
          >
            {isAr ? '”' : '“'}
          </span>
          <h2 className="relative text-3xl sm:text-4xl md:text-[44px] font-semibold leading-[1.15] tracking-[-0.04em] text-primary">
            {isAr
              ? 'حياة واحدة. وخبرات أعمار متعددة.'
              : 'One life. Many lifetimes of experience.'}
          </h2>
        </blockquote>

        {/* Vision Narrative Paragraphs */}
        <div className="mt-6 max-w-2xl space-y-3.5 text-base sm:text-[17px] leading-relaxed text-muted-foreground">
          <p>
            {isAr
              ? 'هناك من سبقك إلى حيث تتجه. مرّ بالأخطاء، واكتشف ما ينجح فعلاً، وتعلّم الكثير على طول الطريق.'
              : 'Someone’s been where you’re going. They’ve made the mistakes, found what works, and learned a thing or two along the way.'}
          </p>
          <p>
            {isAr ? (
              <>
                <BokBok className="text-primary font-semibold" /> تجمعك بهؤلاء الأشخاص. استفد من خبراتهم، ووفّر على
                نفسك بعض التخمين، واتخذ خطوتك التالية بثقة.
              </>
            ) : (
              <>
                <BokBok className="text-primary font-semibold" /> brings you those people. Tap into their experience,
                skip some guesswork, and make your next move with confidence.
              </>
            )}
          </p>
        </div>

        {/* Tagline & Call to Action */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5 sm:gap-7">
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            <span className="relative inline-block">
              <span className="relative z-10">
                {isAr ? 'طريقك المختصر إلى الأمام.' : 'Your shortcut forward.'}
              </span>
              <span className="absolute bottom-1 left-0 w-full h-1 bg-accent -z-0 rounded-sm" />
            </span>
          </p>
          <Link
            href={localeHref('/experts')}
            className="group inline-flex items-center gap-3 rounded-full bg-accent hover:bg-accent-hover px-6 py-3.5 text-sm font-bold text-primary shadow-xs transition-all hover:-translate-y-0.5"
          >
            {isAr ? 'اعثر على خبيرك' : 'Find your expert'}
            <ArrowRight
              size={17}
              className={`transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'
                }`}
            />
          </Link>
        </div>

        {/* Visual: Multiple navy expert paths converging into one golden yellow path #FCAD35 toward the customer */}

      </div>
    </section>
  )
}

export default VisionSection
