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

const EXPERTS = [
  {
    id: '6708a0000000000000000001',
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

const DEFAULT_WEEKLY_SCHEDULE = {
  0: { enabled: true, startTime: '09:00', endTime: '17:00', breaks: [{ id: 'b0-1', start: '13:00', end: '14:00', label: 'Lunch Break' }] },
  1: { enabled: true, startTime: '09:00', endTime: '17:00', breaks: [{ id: 'b1-1', start: '13:00', end: '14:00', label: 'Lunch Break' }] },
  2: { enabled: true, startTime: '09:00', endTime: '17:00', breaks: [{ id: 'b2-1', start: '13:00', end: '14:00', label: 'Lunch Break' }] },
  3: { enabled: true, startTime: '09:00', endTime: '17:00', breaks: [{ id: 'b3-1', start: '13:00', end: '14:00', label: 'Lunch Break' }] },
  4: { enabled: true, startTime: '09:00', endTime: '16:00', breaks: [{ id: 'b4-1', start: '13:00', end: '14:00', label: 'Lunch Break' }] },
  5: { enabled: false, startTime: '09:00', endTime: '17:00', breaks: [] },
  6: { enabled: true, startTime: '10:00', endTime: '15:00', breaks: [] },
}

const EXPERT_SCHEDULES = [
  {
    expertId: '6708a0000000000000000001',
    weeklySchedule: {
      ...DEFAULT_WEEKLY_SCHEDULE,
      0: { enabled: true, startTime: '10:00', endTime: '18:00', breaks: [{ id: 'b0-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }] },
      1: { enabled: true, startTime: '10:00', endTime: '18:00', breaks: [{ id: 'b1-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }] },
      2: { enabled: true, startTime: '10:00', endTime: '18:00', breaks: [{ id: 'b2-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }] },
      3: { enabled: true, startTime: '10:00', endTime: '18:00', breaks: [{ id: 'b3-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }] },
      4: { enabled: true, startTime: '10:00', endTime: '16:00', breaks: [{ id: 'b4-1', start: '12:30', end: '13:30', label: 'Lunch' }] },
      5: { enabled: false, startTime: '10:00', endTime: '18:00', breaks: [] },
      6: { enabled: false, startTime: '10:00', endTime: '15:00', breaks: [] },
    },
    slotIntervalMinutes: 45,
  },
  {
    expertId: '6708a0000000000000000002',
    weeklySchedule: { ...DEFAULT_WEEKLY_SCHEDULE },
    slotIntervalMinutes: 30,
  },
  {
    expertId: '6708a0000000000000000003',
    weeklySchedule: {
      ...DEFAULT_WEEKLY_SCHEDULE,
      4: { enabled: true, startTime: '08:30', endTime: '16:30', breaks: [{ id: 'b4-1', start: '12:00', end: '13:00', label: 'Lunch' }] },
      6: { enabled: true, startTime: '11:00', endTime: '16:00', breaks: [] },
    },
    slotIntervalMinutes: 30,
  },
]

const OVERRIDES = [
  {
    expertId: '6708a0000000000000000001',
    expertSlug: 'layla-hassan',
    date: '2026-10-16',
    type: 'closed',
    reason: 'Product Leaders Summit Speaker',
  },
  {
    expertId: '6708a0000000000000000001',
    expertSlug: 'layla-hassan',
    date: '2026-10-17',
    type: 'custom',
    startTime: '14:00',
    endTime: '19:00',
    breaks: [],
    reason: 'Special Weekend Strategy Clinic',
  },
  {
    expertId: '6708a0000000000000000002',
    expertSlug: 'ahmed-mohamed',
    date: '2026-10-20',
    type: 'closed',
    reason: 'Client Onsite Training Day',
  },
]

async function seed() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    console.log('Connected to MongoDB Atlas!')
    const db = client.db('bok_bok')

    // Clean up any old untyped records in settings and overrides
    await db.collection('settings').deleteMany({})
    await db.collection('date_overrides').deleteMany({})

    // 1. Seed experts collection (each record has real ObjectId _id)
    const expertsCol = db.collection('experts')
    for (const exp of EXPERTS) {
      const expertObjId = new ObjectId(exp.id)
      await expertsCol.updateOne(
        { _id: expertObjId },
        {
          $set: {
            ...exp,
            _id: expertObjId,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      )
      console.log(`Expert record saved: ${exp.name} with _id: ObjectId('${expertObjId}')`)
    }

    // 2. Seed settings collection linked with expertId as BSON ObjectId!
    const settingsCol = db.collection('settings')
    for (const exp of EXPERT_SCHEDULES) {
      const expertObjId = new ObjectId(exp.expertId)
      const key = `availability_schedule_${expertObjId.toString()}`

      await settingsCol.insertOne({
        key,
        expertId: expertObjId, // Stored as BSON ObjectId!
        value: {
          weeklySchedule: exp.weeklySchedule,
          slotIntervalMinutes: exp.slotIntervalMinutes,
        },
        updatedAt: new Date(),
      })
      console.log(`Settings saved with expertId as BSON ObjectId: ObjectId('${expertObjId}')`)
    }

    // 3. Seed date_overrides collection linked with expertId as BSON ObjectId!
    const overridesCol = db.collection('date_overrides')
    for (const ov of OVERRIDES) {
      const expertObjId = new ObjectId(ov.expertId)

      await overridesCol.insertOne({
        expertId: expertObjId, // Stored as BSON ObjectId!
        expertSlug: ov.expertSlug,
        date: ov.date,
        type: ov.type,
        startTime: ov.startTime || '09:00',
        endTime: ov.endTime || '17:00',
        breaks: ov.breaks || [],
        reason: ov.reason || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log(`Override for ${ov.date} saved with expertId as BSON ObjectId: ObjectId('${expertObjId}')`)
    }

    console.log('\n--- VERIFYING BSON TYPES IN ATLAS ---')
    const verifySettings = await settingsCol.find({}).toArray()
    for (const s of verifySettings) {
      console.log(`Setting expertId is ObjectId: ${s.expertId instanceof ObjectId} (${s.expertId})`)
    }

    const verifyOverrides = await overridesCol.find({}).toArray()
    for (const o of verifyOverrides) {
      console.log(`Override expertId is ObjectId: ${o.expertId instanceof ObjectId} (${o.expertId})`)
    }

    console.log('\nMongoDB Atlas seeding with native ObjectId references complete!')
  } finally {
    await client.close()
  }
}

seed().catch(console.error)
