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
  console.error('No MONGODB_URI found in .env.local')
  process.exit(1)
}

function slugify(text) {
  const s = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'service'
}

async function migrate() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    const db = client.db('bok_bok')
    const servicesCol = db.collection('services')

    // Find all services needing migration
    const cursor = servicesCol.find({})
    let count = 0
    let updated = 0

    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      count++

      const updates = {}

      if (!doc.slug) {
        const baseSlug = slugify(doc.title?.en || doc.title || 'service')
        let candidateSlug = baseSlug
        let counter = 2
        while (await servicesCol.findOne({ slug: candidateSlug, _id: { $ne: doc._id } })) {
          candidateSlug = `${baseSlug}-${counter}`
          counter++
        }
        updates.slug = candidateSlug
      }

      if (!doc.bookingType) {
        updates.bookingType = 'APPOINTMENT'
      }
      if (!doc.serviceKind) {
        updates.serviceKind = 'CONSULTATION'
      }
      if (!doc.deliveryMode) {
        updates.deliveryMode = 'ONLINE'
      }
      if (!Array.isArray(doc.tags)) {
        updates.tags = []
      }
      if (typeof doc.breakAfterMinutes !== 'number') {
        updates.breakAfterMinutes = 0
      }
      if (!doc.approvalStatus) {
        updates.approvalStatus = 'approved'
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date()
        await servicesCol.updateOne({ _id: doc._id }, { $set: updates })
        updated++
      }
    }

    console.log(`Migration finished. Examined ${count} services, updated ${updated} services.`)

    // Ensure indexes
    await servicesCol.createIndex({ slug: 1 }, { unique: true, sparse: true })
    await servicesCol.createIndex({ bookingType: 1, serviceKind: 1, isActive: 1, approvalStatus: 1 })
    await servicesCol.createIndex({ categorySlug: 1, subcategorySlug: 1, isActive: 1 })
    await servicesCol.createIndex({ tags: 1, isActive: 1 })
    console.log('Indexes verified successfully.')

  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    await client.close()
  }
}

migrate()
