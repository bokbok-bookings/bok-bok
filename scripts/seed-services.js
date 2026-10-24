const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  })
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('No MONGODB_URI found!')
  process.exit(1)
}

const SAMPLE_SERVICES = [
  // Layla Hassan (Product Strategy)
  {
    expertId: '6708a0000000000000000001',
    title: {
      en: 'Product Strategy & Roadmap Deep Dive',
      ar: 'جلسة معمقة لاستراتيجية المنتج وخريطة الطريق',
    },
    description: {
      en: 'Sharpen your product vision, prioritize the right features, and align your team for the next launch.',
      ar: 'صقل رؤية منتجك، وترتيب أولويات الميزات الأساسية، ومواءمة فريقك للإطلاق القادم.',
    },
    categorySlug: 'marketing-growth',
    subcategorySlug: 'digital-marketing-strategy',
    tags: ['Product', 'Strategy', 'Roadmap'],
    durationMinutes: 45,
    breakAfterMinutes: 15,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 750, USD: 25, SAR: 95 },
    },
    isActive: true,
    isMostBooked: true,
    sortOrder: 1,
  },
  {
    expertId: '6708a0000000000000000001',
    title: {
      en: 'User Research & Discovery Audit',
      ar: 'تدقيق أبحاث المستخدمين واكتشاف الاحتياجات',
    },
    description: {
      en: 'Analyze feedback loops, identify core user pain points, and define actionable problem statements.',
      ar: 'تحليل تجارب المستخدمين ونقاط الألم وتحديد خطوات التطوير العملية.',
    },
    categorySlug: 'marketing-growth',
    subcategorySlug: 'branding-positioning',
    tags: ['Research', 'Discovery', 'UX'],
    durationMinutes: 30,
    breakAfterMinutes: 10,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 500, USD: 18, SAR: 65 },
    },
    isActive: true,
    isMostBooked: false,
    sortOrder: 2,
  },

  // Ahmed Mohamed (Marketing & Growth)
  {
    expertId: '6708a0000000000000000002',
    title: {
      en: 'Growth & Acquisition Marketing Audit',
      ar: 'تدقيق التسويق والنمو واكتساب العملاء',
    },
    description: {
      en: 'Detailed review of your customer acquisition funnels, CAC optimization, and campaign structure.',
      ar: 'مراجعة تفصيلية لمسارات اكتساب العملاء وتحسين تكلفة الاستحواذ وهيكلة الحملات.',
    },
    categorySlug: 'marketing-growth',
    subcategorySlug: 'paid-ads-performance',
    tags: ['Marketing', 'Growth', 'Ads'],
    durationMinutes: 45,
    breakAfterMinutes: 15,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 500, USD: 18, SAR: 65 },
    },
    isActive: true,
    isMostBooked: true,
    sortOrder: 1,
  },
  {
    expertId: '6708a0000000000000000002',
    title: {
      en: 'Brand Positioning & Message Testing',
      ar: 'تحديد تموضع العلامة واختبار الرسائل التسويقية',
    },
    description: {
      en: 'Define your unique value proposition and craft compelling copy that converts.',
      ar: 'تحديد القيمة الفريدة وصياغة رسائل تسويقية مقنعة تجذب جمهورك المستهدف.',
    },
    categorySlug: 'marketing-growth',
    subcategorySlug: 'branding-positioning',
    tags: ['Branding', 'Positioning', 'Copywriting'],
    durationMinutes: 30,
    breakAfterMinutes: 10,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 350, USD: 12, SAR: 45 },
    },
    isActive: true,
    isMostBooked: false,
    sortOrder: 2,
  },

  // Omar Khalil (Career & Leadership)
  {
    expertId: '6708a0000000000000000003',
    title: {
      en: 'Leadership 1-on-1 & Executive Coaching',
      ar: 'جلسة تدريب تنفيذي وقيادة فردية',
    },
    description: {
      en: 'Master difficult conversations, build team trust, and develop executive presence.',
      ar: 'إتقان الحوارات الصعبة، وبناء الثقة في الفريق، وتطوير الحضور القيادي.',
    },
    categorySlug: 'career-development',
    subcategorySlug: 'leadership-management',
    tags: ['Leadership', 'Management', 'Executive'],
    durationMinutes: 45,
    breakAfterMinutes: 15,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 400, USD: 15, SAR: 55 },
    },
    isActive: true,
    isMostBooked: true,
    sortOrder: 1,
  },
  {
    expertId: '6708a0000000000000000003',
    title: {
      en: 'Career Transition & Salary Strategy',
      ar: 'استراتيجية الانتقال الوظيفي والتفاوض على الراتب',
    },
    description: {
      en: 'Strategic guidance on stepping up your career, role pivots, and negotiation tactics.',
      ar: 'توجيه استراتيجي للارتقاء بمسارك المهني، وتغيير التخصص، وتكتيكات التفاوض.',
    },
    categorySlug: 'career-development',
    subcategorySlug: 'salary-negotiation',
    tags: ['Career', 'Negotiation', 'Salary'],
    durationMinutes: 30,
    breakAfterMinutes: 10,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 300, USD: 10, SAR: 40 },
    },
    isActive: true,
    isMostBooked: false,
    sortOrder: 2,
  },
]

async function seedServices() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    console.log('Connected to MongoDB Atlas...')
    const db = client.db('bok_bok')
    const servicesCol = db.collection('services')

    // Clean existing services
    await servicesCol.deleteMany({})

    for (const s of SAMPLE_SERVICES) {
      const expertObjId = new ObjectId(s.expertId)
      const serviceId = new ObjectId()

      await servicesCol.insertOne({
        _id: serviceId,
        expertId: expertObjId, // BSON ObjectId!
        title: s.title,
        description: s.description,
        categorySlug: s.categorySlug,
        subcategorySlug: s.subcategorySlug,
        tags: s.tags,
        durationMinutes: s.durationMinutes,
        breakAfterMinutes: s.breakAfterMinutes,
        pricing: s.pricing,
        isActive: s.isActive,
        isMostBooked: s.isMostBooked,
        sortOrder: s.sortOrder,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log(`✓ Seeded service "${s.title.en}" with expertId as ObjectId('${expertObjId}')`)
    }

    // Ensure all existing services in DB have approvalStatus approved
    await servicesCol.updateMany(
      { approvalStatus: { $exists: false } },
      { $set: { approvalStatus: 'approved', approvedAt: new Date() } }
    )

    console.log('\nServices seeding complete!')
  } finally {
    await client.close()
  }
}

seedServices().catch(console.error)
