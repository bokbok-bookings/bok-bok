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
  Layers,
  GraduationCap,
} from 'lucide-react'

export default function HowItWorksPage() {
  const [activeAudience, setActiveAudience] = useState<'clients' | 'experts'>('clients')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const clientSteps = [
    {
      num: '01',
      title: 'Find the Right Expert & Offering',
      desc: 'Explore vetted industry leaders across 11 key fields including Tech, Marketing, Business, and Career. Filter by service type, language, and session duration.',
      icon: Compass,
      highlight: 'Tailored matching',
    },
    {
      num: '02',
      title: 'Pick a Date & Time Slot',
      desc: 'Browse real-time expert availability with zero email back-and-forth. Select session lengths that fit your need — from a quick 45-min advisory to 2–4 hour deep dives.',
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
      desc: 'Connect over online video or in-person. Walk away with clear recommendations, recorded insights, and a concrete roadmap for your next breakthrough.',
      icon: Video,
      highlight: 'Actionable outcomes',
    },
  ]

  const expertSteps = [
    {
      num: '01',
      title: 'Build Your Service Catalog',
      desc: 'Package what you know into 1-on-1 consultations, audits, hands-on workshops, or masterclass webinars with your own pricing in EGP, USD, or SAR.',
      icon: Briefcase,
      highlight: 'Full catalog control',
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
      desc: 'Conduct your sessions, earn verified client reviews, share your dedicated service slugs directly on social media, and grow your advisory practice.',
      icon: Sparkles,
      highlight: 'Shareable links by slug',
    },
  ]

  const offeringFormats = [
    {
      title: '1-on-1 Consultations',
      desc: 'Focused advice and high-leverage strategic guidance customized to your specific challenges.',
      badge: 'Personalized',
      icon: Sparkles,
      color: 'bg-[#fff2ed] text-[#ef5b4c]',
      link: '/consultations',
      cta: 'Browse Consultations',
    },
    {
      title: 'Direct Services',
      desc: 'Outcome-based sessions like code reviews, marketing audits, pitch deck evaluations, and roadmaps.',
      badge: 'Deliverable-Focused',
      icon: Layers,
      color: 'bg-emerald-50 text-emerald-600',
      link: '/services',
      cta: 'Explore Services',
    },
    {
      title: 'Interactive Workshops',
      desc: 'Small-group intensive cohorts with practical exercises, peer feedback, and hands-on skill building.',
      badge: 'Small Groups',
      icon: GraduationCap,
      color: 'bg-purple-50 text-purple-600',
      link: '/workshops',
      cta: 'Join Workshops',
    },
    {
      title: 'Live Webinars',
      desc: 'Broadcast masterclasses and industry roundtables with live audience Q&A sessions.',
      badge: 'Open Access',
      icon: Users,
      color: 'bg-amber-50 text-amber-600',
      link: '/webinars',
      cta: 'Discover Webinars',
    },
  ]

  const faqs = [
    {
      q: 'How are Bok Bok experts vetted?',
      a: 'Every expert undergoes a thorough identity, professional track record, and portfolio verification before being published to the public directory. We verify real-world industry impact, credentials, and past client feedback.',
    },
    {
      q: 'How does payment with InstaPay work?',
      a: 'When you choose a slot or ticket, you will see the official Bok Bok InstaPay address. Make the transfer from your banking app or InstaPay, upload a screenshot or PDF receipt, and our automated verification team approves your booking.',
    },
    {
      q: 'What is the difference between a Consultation and a Service?',
      a: 'A Consultation is an open advisory session focused on conversation and strategy. A Service is an outcome-driven package (such as an SEO Audit, UX Review, or Architecture Deep Dive) that includes pre-requisites and concrete deliverables.',
    },
    {
      q: 'Can sessions be scheduled for longer than 1 hour?',
      a: 'Yes! Bok Bok supports multi-hour sessions (up to 4 hours) with automated break buffers so experts can deliver comprehensive half-day workshops or extensive project deep dives.',
    },
    {
      q: 'How can an expert share their services directly?',
      a: 'Each service has a clean, human-readable shareable link (e.g., bokbok.com/services/product-strategy-roadmap) that experts can copy straight from their workspace to share on LinkedIn, Instagram, or WhatsApp.',
    },
    {
      q: 'What if I need to reschedule?',
      a: 'You can request a reschedule through your confirmation email up to 24 hours before the scheduled time slot, allowing the expert to re-assign an alternative slot on their live calendar.',
    },
  ]

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#14243b] overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative border-b border-[#e7e2da] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f4cfc8] bg-[#fff2ed] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#d95347]">
            <span className="size-1.5 rounded-full bg-[#ef5b4c]" />
            Transparent & Simple by Design
          </div>

          <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight text-[#14243b] max-w-3xl mx-auto leading-tight">
            How <span className="font-heading text-[#ef5b4c]">Bok Bok</span> Works
          </h1>

          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-[#637084] leading-relaxed">
            Direct access to proven specialists. Seamless live scheduling, verified InstaPay payments, and zero administrative back-and-forth.
          </p>

          {/* Audience Switcher */}
          <div className="mt-10 inline-flex rounded-full bg-[#f4f2ee] p-1.5 border border-[#e7e2da]">
            <button
              type="button"
              onClick={() => setActiveAudience('clients')}
              className={`rounded-full px-6 py-2.5 text-xs font-bold transition ${activeAudience === 'clients'
                ? 'bg-[#14243b] text-white shadow-sm'
                : 'text-[#637084] hover:text-[#14243b]'
                }`}
            >
              For Clients & Businesses
            </button>
            <button
              type="button"
              onClick={() => setActiveAudience('experts')}
              className={`rounded-full px-6 py-2.5 text-xs font-bold transition ${activeAudience === 'experts'
                ? 'bg-[#14243b] text-white shadow-sm'
                : 'text-[#637084] hover:text-[#14243b]'
                }`}
            >
              For Experts & Advisors
            </button>
          </div>
        </div>
      </section>

      {/* 4-Step Interactive Journey */}
      <section className="py-20">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#ef5b4c]">
              {activeAudience === 'clients' ? 'Client Journey' : 'Expert Flow'}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              {activeAudience === 'clients'
                ? 'Your path from problem to breakthrough'
                : 'Monetize and manage your advisory with ease'}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(activeAudience === 'clients' ? clientSteps : expertSteps).map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.num}
                  className="relative rounded-3xl border border-[#e7e2da] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-3xl font-black text-[#f5c3a8]">{step.num}</span>
                      <div className="grid size-12 place-items-center rounded-2xl bg-[#fff2ed] text-[#ef5b4c]">
                        <Icon size={22} />
                      </div>
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#ef5b4c] mb-1">
                      {step.highlight}
                    </span>
                    <h3 className="text-base font-bold text-[#14243b] mb-2">{step.title}</h3>
                    <p className="text-xs text-[#637084] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4 Formats Section */}
      <section className="border-t border-[#e7e2da] bg-white py-20">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#ef5b4c]">
              Four Flexible Formats
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Choose the format that fits your learning style
            </h2>
            <p className="mt-2 text-xs text-[#637084]">
              From targeted private consultations to group cohorts and broadcast masterclasses.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {offeringFormats.map((fmt) => {
              const Icon = fmt.icon
              return (
                <div
                  key={fmt.title}
                  className="rounded-3xl border border-[#e7e2da] bg-[#fbfaf7] p-6 flex flex-col justify-between transition hover:border-[#f1b0a7] hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`grid size-10 place-items-center rounded-2xl ${fmt.color}`}>
                        <Icon size={20} />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a1]">
                        {fmt.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#14243b]">{fmt.title}</h3>
                    <p className="mt-2 text-xs text-[#637084] leading-relaxed">{fmt.desc}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#eeeae4]">
                    <Link
                      href={fmt.link}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ef5b4c] hover:underline"
                    >
                      {fmt.cta} <ArrowRight size={13} />
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
                <p className="text-xs font-bold uppercase tracking-widest text-[#f5c3a8]">
                  The <BokBok /> Standard
                </p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Built on verification, respect, and tangible progress.
                </h2>
                <p className="mt-4 text-xs text-[#b9c2ce] leading-relaxed">
                  We built <BokBok /> to eliminate noisy marketplaces and replace them with focused, verified advisory where every minute counts.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: '100% Vetted Advisors',
                    text: 'Real practitioners with documented accomplishments, not theoretical gurus.',
                  },
                  {
                    title: 'Guaranteed Availability',
                    text: 'Direct slots locked upon receipt verification with automated calendar sync.',
                  },
                  {
                    title: 'Session Preparation',
                    text: 'Share intake notes and files in advance so sessions dive straight into solutions.',
                  },
                  {
                    title: 'Direct Client Support',
                    text: 'Dedicated assistance for any scheduling adjustments or technical needs.',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                    <CheckCircle2 size={18} className="text-[#ef5b4c] mb-2" />
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
      <section className="border-t border-[#e7e2da] bg-white py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ef5b4c] uppercase tracking-wider mb-2">
              <HelpCircle size={15} /> Frequently Asked Questions
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#14243b]">
              Everything you need to know
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-[#e7e2da] bg-[#fbfaf7] overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-5 text-left font-bold text-sm text-[#14243b]"
                  >
                    <span>{withBokBok(faq.q)}</span>
                    <ChevronDown
                      size={17}
                      className={`text-[#8b94a1] transition-transform duration-200 shrink-0 ml-4 ${isOpen ? 'rotate-180 text-[#ef5b4c]' : ''
                        }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-[#637084] leading-relaxed border-t border-[#eeeae4]">
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
          <div className="rounded-[36px] bg-[#f5c3a8] p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#b65045]">
                Ready to take the next step?
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#14243b]">
                Book a session or share your expertise.
              </h2>
              <p className="mt-1 text-xs text-[#637084]">
                Join thousands of founders, engineers, and creators leveling up through direct mentorship.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <Link
                href="/explore"
                className="rounded-full bg-[#14243b] px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#ef5b4c] transition"
              >
                Browse All Offerings
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-[#14243b]/20 bg-white px-6 py-3.5 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition"
              >
                Apply as an Expert
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
