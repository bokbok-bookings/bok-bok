const { MongoClient } = require('mongodb')
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

async function run() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    console.log('Connected to MongoDB Atlas...')
    const db = client.db('bok_bok')

    console.log('\n--- 1. Creating indexes for `experts` collection ---')
    // Multikey index on tags array
    const tagIdx = await db.collection('experts').createIndex({ tags: 1 }, { name: 'tags_1' })
    console.log(`✓ Created multikey index on tags: ${tagIdx}`)

    // Compound index for tag + price / rating sorting
    const tagPriceIdx = await db.collection('experts').createIndex(
      { tags: 1, priceNumber: 1 },
      { name: 'tags_1_priceNumber_1' }
    )
    console.log(`✓ Created compound index on (tags, priceNumber): ${tagPriceIdx}`)

    // Unique index on slug for fast routing & URL lookups
    const slugIdx = await db.collection('experts').createIndex(
      { slug: 1 },
      { unique: true, name: 'slug_1_unique' }
    )
    console.log(`✓ Created unique index on slug: ${slugIdx}`)

    // Text index for full-text search across name, role, tags, and about
    const textIdx = await db.collection('experts').createIndex(
      {
        name: 'text',
        role: 'text',
        tags: 'text',
        about: 'text',
      },
      {
        weights: {
          name: 10,
          role: 5,
          tags: 4,
          about: 1,
        },
        name: 'expert_text_search',
      }
    )
    console.log(`✓ Created full-text search index: ${textIdx}`)

    console.log('\n--- 2. Creating indexes for `settings` collection ---')
    const settingsIdx = await db.collection('settings').createIndex(
      { expertId: 1, key: 1 },
      { name: 'expertId_1_key_1' }
    )
    console.log(`✓ Created index on settings (expertId, key): ${settingsIdx}`)

    console.log('\n--- 3. Creating indexes for `date_overrides` collection ---')
    const overridesIdx = await db.collection('date_overrides').createIndex(
      { expertId: 1, date: 1 },
      { name: 'expertId_1_date_1' }
    )
    console.log(`✓ Created index on date_overrides (expertId, date): ${overridesIdx}`)

    console.log('\n--- 4. Creating indexes for `bookings` collection ---')
    const bookingsIdx = await db.collection('bookings').createIndex(
      { expertId: 1, date: 1, status: 1 },
      { name: 'expertId_1_date_1_status_1' }
    )
    console.log(`✓ Created index on bookings (expertId, date, status): ${bookingsIdx}`)

    console.log('\n--- VERIFYING CURRENT INDEXES ---')
    const expertIndexes = await db.collection('experts').indexes()
    console.log('Experts collection indexes:')
    expertIndexes.forEach((idx) => console.log(`  - ${idx.name}:`, JSON.stringify(idx.key)))

    const settingsIndexes = await db.collection('settings').indexes()
    console.log('\nSettings collection indexes:')
    settingsIndexes.forEach((idx) => console.log(`  - ${idx.name}:`, JSON.stringify(idx.key)))

    const overrideIndexes = await db.collection('date_overrides').indexes()
    console.log('\nDate Overrides collection indexes:')
    overrideIndexes.forEach((idx) => console.log(`  - ${idx.name}:`, JSON.stringify(idx.key)))

    const bookingIndexes = await db.collection('bookings').indexes()
    console.log('\nBookings collection indexes:')
    bookingIndexes.forEach((idx) => console.log(`  - ${idx.name}:`, JSON.stringify(idx.key)))

    console.log('\nAll indexes successfully verified in MongoDB Atlas!')
  } finally {
    await client.close()
  }
}

run().catch((err) => {
  console.error('Failed to create indexes:', err)
  process.exit(1)
})
