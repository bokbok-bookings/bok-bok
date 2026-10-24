'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react'

const categories = [
  { icon: BriefcaseBusiness, name: 'Business', description: 'Strategy, growth & operations', experts: '128 experts' },
  { icon: Sparkles, name: 'Marketing', description: 'Build a brand people remember', experts: '96 experts' },
  { icon: Compass, name: 'Technology', description: 'Navigate your next big build', experts: '84 experts' },
  { icon: HeartHandshake, name: 'Wellbeing', description: 'Support for life and work', experts: '72 experts' },
  { icon: GraduationCap, name: 'Career', description: 'Make your next move count', experts: '65 experts' },
]

const experts = [
  { name: 'Ahmed Mohamed', role: 'Marketing Consultant', location: 'Cairo, Egypt', initials: 'AM', image: '/experts/ahmed.png', color: 'bg-[#f2b58f]', rating: '4.9', reviews: '124', price: '500 EGP', next: 'Today, 8:00 PM', tags: ['Marketing', 'Growth'] },
  { name: 'Layla Hassan', role: 'Product Strategy Expert', location: 'Dubai, UAE', initials: 'LH', image: '/experts/layla.png', color: 'bg-[#d4c7ee]', rating: '5.0', reviews: '89', price: '750 EGP', next: 'Tomorrow, 11:00 AM', tags: ['Product', 'Business'] },
  { name: 'Omar Khalil', role: 'Career & Leadership Coach', location: 'Amman, Jordan', initials: 'OK', image: '/experts/omar.png', color: 'bg-[#b8d5c3]', rating: '4.8', reviews: '67', price: '400 EGP', next: 'Today, 6:30 PM', tags: ['Career', 'Leadership'] },
]

export default function Page() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [language, setLanguage] = useState('EN')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [categoriesList, setCategoriesList] = useState<any[]>(categories)

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const iconLookup: Record<string, any> = {
            marketing: Sparkles,
            'business-entrepreneurship': BriefcaseBusiness,
            'technology-it': Compass,
            'career-professional-development': GraduationCap,
            'education-learning': GraduationCap,
            'fitness-wellness': HeartHandshake,
            'languages-communication': Globe2,
          }
          const formatted = json.data.map((c: any) => ({
            icon: iconLookup[c.slug] || Sparkles,
            name: c.name?.en || c.title?.en,
            nameAr: c.name?.ar || c.title?.ar,
            description: c.description?.en || 'Guidance from top experts in this field',
            experts: `${c.subcategories?.length || 0} specializations`,
          }))
          setCategoriesList(formatted)
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))
  }, [])

  const filteredExperts = experts.filter((expert) => {
    const matchesSearch = !search || `${expert.name} ${expert.role} ${expert.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'All' || expert.tags.includes(activeCategory)
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf7] text-[#14243b]">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <header className="flex h-[82px] items-center justify-between border-b border-[#e7e2da]">
          <a href="#top" className="flex items-center gap-2.5 text-[22px] font-bold tracking-[-0.04em]">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#ef5b4c] text-sm font-black text-white">B</span>
            Bok Bok
          </a>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#637084] lg:flex">
            <a className="transition-colors hover:text-[#ef5b4c]" href="/experts">Find an Expert</a>
            <a className="transition-colors hover:text-[#ef5b4c]" href="/dashboard">Expert Workspace</a>
            <a className="transition-colors hover:text-[#ef5b4c]" href="/admin">Admin Ops</a>
            <a className="transition-colors hover:text-[#ef5b4c]" href="#how-it-works">How It Works</a>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <a href="/translate" className="flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-semibold text-[#637084] hover:bg-white"><Globe2 size={15} /> {language}<ChevronDown size={13} /></a>
            <a href="/login" className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#14243b] hover:bg-white">Log in</a>
            <a href="/signup" className="rounded-full bg-[#14243b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5">Sign up</a>
          </div>
          <button aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)} className="grid size-10 place-items-center rounded-full bg-white sm:hidden">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </header>
        {mobileOpen && <nav className="flex flex-col gap-5 border-b border-[#e7e2da] py-5 text-sm font-medium lg:hidden"><a href="/experts">Find an Expert</a><a href="#categories">Categories</a><a href="#how-it-works">How It Works</a><a href="#become-expert">Become an Expert</a></nav>}

        <section id="top" className="relative grid min-h-[550px] items-center gap-12 py-20 lg:grid-cols-[1fr_0.88fr] lg:gap-20 lg:py-24">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f4cfc8] bg-[#fff2ed] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#d95347]"><span className="size-1.5 rounded-full bg-[#ef5b4c]" /> The better way to get help</div>
            <h1 className="max-w-[620px] text-[54px] font-semibold leading-[0.98] tracking-[-0.065em] text-[#14243b] sm:text-[72px]">Find your<br /><span className="text-[#ef5b4c]">right expert.</span></h1>
            <p className="mt-7 max-w-[460px] text-[17px] leading-7 text-[#637084]">Connect with trusted people who know how to move things forward. Book a focused session, get clear guidance, and leave with a plan.</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="/experts" className="group inline-flex items-center gap-3 rounded-full bg-[#ef5b4c] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(239,91,76,.7)] transition-all hover:-translate-y-0.5">Find an expert <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></a><a href="#how-it-works" className="inline-flex items-center gap-2 rounded-full border border-[#d9d6d0] bg-white px-6 py-3.5 text-sm font-bold text-[#14243b] hover:border-[#14243b]">How it works</a></div>
            <div className="mt-10 flex items-center gap-5 text-[12px] font-medium text-[#637084]"><span className="flex items-center gap-1.5"><ShieldCheck size={17} className="text-[#ef5b4c]" /> Vetted experts</span><span className="flex items-center gap-1.5"><Check size={17} className="text-[#ef5b4c]" /> Flexible booking</span></div>
          </div>
          <div className="relative mx-auto h-[390px] w-full max-w-[460px] lg:h-[430px]">
            <div className="absolute inset-0 rotate-[-4deg] rounded-[42px] bg-[#f5c3a8]" /><div className="absolute inset-2 rotate-[5deg] rounded-[42px] bg-[#14243b]" />
            <div className="absolute inset-0 overflow-hidden rounded-[42px] bg-[#f3ebe1] shadow-2xl">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-[#ef5b4c] opacity-90" /><div className="absolute -bottom-20 -left-10 size-56 rounded-full border-[22px] border-[#f5c3a8]" />
              <div className="absolute left-8 top-8 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-bold tracking-wide text-[#ef5b4c]">BOOK BETTER</div>
              <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8b94a1]">Your next step</p><p className="mt-1 text-lg font-bold">Make it happen.</p></div><span className="grid size-10 place-items-center rounded-full bg-[#fff0ed] text-[#ef5b4c]"><ArrowRight size={18} /></span></div><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#d4c7ee] text-xs font-bold text-[#14243b]">LH</div><div><p className="text-sm font-bold">Layla Hassan</p><p className="text-xs text-[#8b94a1]">Product strategy · 5.0 ★</p></div><span className="ml-auto text-xs font-bold text-[#ef5b4c]">750 EGP</span></div></div>
            </div>
          </div>
        </section>

        <section id="categories" className="border-t border-[#e7e2da] py-20"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#ef5b4c]">Start somewhere</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">What can we help with?</h2></div><a href="/experts" className="flex items-center gap-2 text-sm font-bold text-[#ef5b4c]">Explore all categories <ArrowRight size={16} /></a></div><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categoriesList.map(({ icon: Icon, name, description, experts: count }) => <button key={name} onClick={() => { setActiveCategory(name); document.getElementById('experts')?.scrollIntoView({ behavior: 'smooth' }) }} className="group rounded-3xl border border-[#e7e2da] bg-white p-5 text-left transition-all hover:-translate-y-1 hover:border-[#f1b0a7] hover:shadow-lg"><span className="mb-12 grid size-11 place-items-center rounded-2xl bg-[#fff0ed] text-[#ef5b4c] transition-colors group-hover:bg-[#ef5b4c] group-hover:text-white"><Icon size={20} /></span><p className="font-bold">{name}</p><p className="mt-1 min-h-10 text-xs leading-5 text-[#7c8797]">{description}</p><p className="mt-4 text-[11px] font-bold text-[#ef5b4c]">{count}</p></button>)}</div></section>

        <section id="how-it-works" className="rounded-[36px] bg-[#14243b] px-7 py-14 text-white sm:px-12 sm:py-16"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#f5c3a8]">Simple by design</p><h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-[-.05em]">Good advice is only three steps away.</h2></div><div className="grid gap-8 sm:grid-cols-3">{[['01', 'Find your expert', 'Browse people based on what you need.'], ['02', 'Choose a time', 'Pick a service and time that works.'], ['03', 'Book with confidence', 'Show up ready to make progress.']].map(([number, title, text]) => <div key={number} className="border-t border-white/20 pt-4"><p className="text-sm font-bold text-[#f5c3a8]">{number}</p><p className="mt-5 font-bold">{title}</p><p className="mt-2 text-sm leading-6 text-[#b9c2ce]">{text}</p></div>)}</div></div></section>

        <section id="experts" className="py-20"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#ef5b4c]">People worth meeting</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Meet our top experts</h2></div><div className="flex items-center gap-2"><button className="grid size-9 place-items-center rounded-full border border-[#dedbd5] bg-white text-[#637084]"><ChevronLeft size={17} /></button><button className="grid size-9 place-items-center rounded-full border border-[#dedbd5] bg-white text-[#637084]"><ChevronRight size={17} /></button></div></div>
          <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-[#e7e2da] bg-white p-3 sm:flex-row sm:items-center sm:p-2"><div className="flex flex-1 items-center gap-3 px-3"><Search size={18} className="text-[#8b94a1]" /><input aria-label="Search experts" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, skill or topic" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[#a2a9b2]" /></div><div className="flex gap-2 overflow-x-auto"><button onClick={() => setActiveCategory('All')} className={`rounded-full px-4 py-2 text-xs font-bold ${activeCategory === 'All' ? 'bg-[#14243b] text-white' : 'bg-[#f7f5f1] text-[#637084]'}`}>All</button>{['Business', 'Marketing', 'Career'].map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap ${activeCategory === category ? 'bg-[#14243b] text-white' : 'bg-[#f7f5f1] text-[#637084]'}`}>{category}</button>)}</div></div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">{filteredExperts.map((expert) => <article key={expert.name} className="rounded-3xl border border-[#e7e2da] bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><div className={`relative size-14 overflow-hidden rounded-2xl ${expert.color}`}><Image src={expert.image} alt={`${expert.name} portrait`} fill sizes="56px" className="object-cover" /></div><span className="flex items-center gap-1 rounded-full bg-[#fff9e8] px-2.5 py-1 text-[11px] font-bold text-[#b17b17]"><Star size={12} fill="currentColor" /> {expert.rating}</span></div><h3 className="mt-5 font-bold">{expert.name}</h3><p className="mt-1 text-sm text-[#637084]">{expert.role}</p><p className="mt-1 text-xs text-[#9aa2ad]">{expert.location}</p><div className="mt-4 flex flex-wrap gap-1.5">{expert.tags.map((tag) => <span key={tag} className="rounded-full bg-[#f7f5f1] px-2.5 py-1 text-[10px] font-bold text-[#637084]">{tag}</span>)}</div><div className="mt-5 border-t border-[#eeeae4] pt-4"><div className="flex items-center justify-between text-xs"><span className="text-[#8b94a1]">Next available</span><span className="font-bold text-[#14243b]">{expert.next}</span></div><div className="mt-3 flex items-center justify-between"><span className="text-sm font-bold">From {expert.price}</span><a href={`/experts/${expert.name.toLowerCase().replaceAll(' ', '-')}`} className="rounded-full bg-[#14243b] px-4 py-2 text-xs font-bold text-white hover:bg-[#ef5b4c]">View profile</a></div></div></article>)}</div>{filteredExperts.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-[#d9d6d0] p-12 text-center text-sm text-[#637084]">No experts found. Try another search.</div>}</section>

        <section id="become-expert" className="mb-16 flex flex-col gap-7 rounded-[36px] bg-[#f5c3a8] px-7 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#b65045]">Your experience matters</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-.04em] text-[#14243b]">Turn what you know into someone else&apos;s next breakthrough.</h2></div><button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#14243b] px-6 py-3.5 text-sm font-bold text-white">Become an expert <ArrowRight size={17} /></button></section>
        <footer className="flex flex-col gap-5 border-t border-[#e7e2da] py-8 text-xs text-[#7c8797] sm:flex-row sm:items-center sm:justify-between"><span className="font-bold text-[#14243b]">Bok Bok</span><span>Expertise, made human.</span><div className="flex gap-5"><a href="#top">Privacy</a><a href="#top">Terms</a><a href="#top">Help center</a></div></footer>
      </div>
    </main>
  )
}
