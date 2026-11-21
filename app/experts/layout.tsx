import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verified Industry Experts & Mentors | Bok Bok',
  description: 'Browse top verified practitioners, mentors, and consultants across business, technology, marketing, and design in Egypt and the Arab world.',
  openGraph: {
    title: 'Verified Industry Experts & Mentors | Bok Bok',
    description: 'Browse top verified practitioners, mentors, and consultants across business, technology, marketing, and design.',
  },
}

export default function ExpertsLayout({ children }: { children: React.ReactNode }) {
  return children
}
