export interface Expert {
  id: string
  _id?: string
  slug: string
  name: string
  role: string
  location: string
  image: string
  rating: string
  reviews: number
  price: string
  priceNumber: number
  tags: string[]
  durationMinutes: number
  about: string
  bio: string
}

export const EXPERTS: Expert[] = [
  {
    id: '6708a0000000000000000001',
    _id: '6708a0000000000000000001',
    slug: 'layla-hassan',
    name: 'Layla Hassan',
    role: 'Product Strategy Expert',
    location: 'Dubai, UAE',
    image: '/experts/layla.png',
    rating: '5.0',
    reviews: 89,
    price: '750 EGP',
    priceNumber: 750,
    tags: ['Product', 'Business', 'Research'],
    durationMinutes: 45,
    about:
      'Product thinking, made practical. Bring your product question, a messy roadmap, or a launch you are unsure about and leave with a sharper plan.',
    bio: 'Product thinking, made practical. Let’s shape your next launch together.',
  },
  {
    id: '6708a0000000000000000002',
    _id: '6708a0000000000000000002',
    slug: 'ahmed-mohamed',
    name: 'Ahmed Mohamed',
    role: 'Marketing Consultant',
    location: 'Cairo, Egypt',
    image: '/experts/ahmed.png',
    rating: '4.9',
    reviews: 124,
    price: '500 EGP',
    priceNumber: 500,
    tags: ['Marketing', 'Growth', 'Positioning'],
    durationMinutes: 45,
    about:
      'I help ambitious founders turn scattered ideas into a clear growth plan. Together we will find the sharpest message, the right audience, and the next action worth taking.',
    bio: 'I help ambitious founders turn scattered ideas into a clear growth plan.',
  },
  {
    id: '6708a0000000000000000003',
    _id: '6708a0000000000000000003',
    slug: 'omar-khalil',
    name: 'Omar Khalil',
    role: 'Career & Leadership Coach',
    location: 'Amman, Jordan',
    image: '/experts/omar.png',
    rating: '4.8',
    reviews: 67,
    price: '400 EGP',
    priceNumber: 400,
    tags: ['Career', 'Leadership', 'Confidence'],
    durationMinutes: 45,
    about:
      'Build confidence, communicate with clarity, and make your next move count. Our sessions are practical, warm, and focused on progress you can feel.',
    bio: 'Build confidence, communicate with clarity, and make your next move count.',
  },
  {
    id: '6708a0000000000000000004',
    _id: '6708a0000000000000000004',
    slug: 'maya-nassar',
    name: 'Maya Nassar',
    role: 'Brand Designer',
    location: 'Beirut, Lebanon',
    image: '/experts/layla.png',
    rating: '4.9',
    reviews: 52,
    price: '600 EGP',
    priceNumber: 600,
    tags: ['Design', 'Marketing'],
    durationMinutes: 45,
    about: 'I make brands feel unmistakably you, from first idea to final detail.',
    bio: 'I make brands feel unmistakably you, from first idea to final detail.',
  },
  {
    id: '6708a0000000000000000005',
    _id: '6708a0000000000000000005',
    slug: 'karim-adel',
    name: 'Karim Adel',
    role: 'Business Operations Advisor',
    location: 'Alexandria, Egypt',
    image: '/experts/ahmed.png',
    rating: '4.9',
    reviews: 41,
    price: '450 EGP',
    priceNumber: 450,
    tags: ['Business', 'Growth'],
    durationMinutes: 45,
    about: 'Simple systems for teams that are ready to grow without the chaos.',
    bio: 'Simple systems for teams that are ready to grow without the chaos.',
  },
  {
    id: '6708a0000000000000000006',
    _id: '6708a0000000000000000006',
    slug: 'nour-haddad',
    name: 'Nour Haddad',
    role: 'UX Researcher',
    location: 'Riyadh, Saudi Arabia',
    image: '/experts/omar.png',
    rating: '5.0',
    reviews: 38,
    price: '650 EGP',
    priceNumber: 650,
    tags: ['Product', 'Design'],
    durationMinutes: 45,
    about: 'Find the signal in customer feedback and build with confidence.',
    bio: 'Find the signal in customer feedback and build with confidence.',
  },
]

export function getExpertBySlug(slug: string): Expert | undefined {
  return EXPERTS.find((e) => e.slug === slug)
}

export function getExpertById(id: string): Expert | undefined {
  return EXPERTS.find((e) => e.id === id || e._id === id)
}
