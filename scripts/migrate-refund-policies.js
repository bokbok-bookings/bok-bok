/**
 * Migration Script: Service-Level Refund Policy Selection
 *
 * Populates existing services that don't already have a refund policy with
 * the Standard policy:
 * {
 *   "type": "standard",
 *   "name": "Standard",
 *   "rules": [
 *     { "refundPercentage": 100, "minimumHoursBefore": 48 },
 *     { "refundPercentage": 50, "minimumHoursBefore": 24 },
 *     { "refundPercentage": 0, "minimumHoursBefore": 0 }
 *   ]
 * }
 *
 * Also backfills existing bookings without a refund policy snapshot to preserve
 * policy immutability.
 */

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
  console.error('No MONGODB_URI found in .env.local')
  process.exit(1)
}

const STANDARD_POLICY = {
  type: 'standard',
  name: 'Standard',
  rules: [
    { refundPercentage: 100, minimumHoursBefore: 48 },
    { refundPercentage: 50, minimumHoursBefore: 24 },
    { refundPercentage: 0, minimumHoursBefore: 0 },
  ],
}

async function migrate() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    console.log('Connected to MongoDB Atlas')
    const db = client.db('bok_bok')
    const servicesCol = db.collection('services')
    const bookingsCol = db.collection('bookings')

    // 1. Migrate Services
    console.log('\n--- 1. Migrating Services ---')
    const serviceFilter = {
      $or: [
        { refundPolicy: { $exists: false } },
        { refundPolicy: null },
        { 'refundPolicy.type': { $exists: false } },
        { 'refundPolicy.rules': { $exists: false } },
      ],
    }

    const unmigratedServices = await servicesCol.find(serviceFilter).toArray()
    console.log(`Found ${unmigratedServices.length} service(s) lacking a structured refund policy.`)

    let servicesUpdated = 0
    for (const service of unmigratedServices) {
      await servicesCol.updateOne(
        { _id: service._id },
        {
          $set: {
            refundPolicy: { ...STANDARD_POLICY },
            updatedAt: new Date(),
          },
        },
      )
      servicesUpdated++
    }
    console.log(`Successfully migrated ${servicesUpdated} service(s) to Standard refund policy.`)

    // 2. Migrate Bookings (Snapshot backfill)
    console.log('\n--- 2. Migrating Booking Snapshots ---')
    const bookingFilter = {
      $or: [
        { refundPolicy: { $exists: false } },
        { refundPolicy: null },
        { 'refundPolicy.type': { $exists: false } },
      ],
    }

    const unmigratedBookings = await bookingsCol.find(bookingFilter).toArray()
    console.log(`Found ${unmigratedBookings.length} booking(s) lacking a refund policy snapshot.`)

    let bookingsUpdated = 0
    for (const booking of unmigratedBookings) {
      let policySnapshot = { ...STANDARD_POLICY, snapshotAt: new Date() }

      // If booking references a service with an existing policy, copy from that service
      if (booking.serviceId && ObjectId.isValid(String(booking.serviceId))) {
        try {
          const srv = await servicesCol.findOne({ _id: new ObjectId(String(booking.serviceId)) })
          if (srv?.refundPolicy?.type && Array.isArray(srv.refundPolicy.rules)) {
            policySnapshot = {
              type: srv.refundPolicy.type,
              name: srv.refundPolicy.name,
              rules: srv.refundPolicy.rules,
              snapshotAt: booking.createdAt || new Date(),
            }
          }
        } catch (err) {
          console.warn(`Could not resolve service for booking ${booking._id}:`, err?.message)
        }
      }

      await bookingsCol.updateOne(
        { _id: booking._id },
        {
          $set: {
            refundPolicy: policySnapshot,
            updatedAt: new Date(),
          },
        },
      )
      bookingsUpdated++
    }
    console.log(`Successfully backfilled ${bookingsUpdated} booking snapshot(s).`)

    // 3. Ensure indexes
    console.log('\n--- 3. Verifying Database Indexes ---')
    await servicesCol.createIndex({ 'refundPolicy.type': 1 })
    await bookingsCol.createIndex({ 'refundPolicy.type': 1 })
    console.log('Verified index on services (refundPolicy.type) and bookings (refundPolicy.type).')

    console.log('\nMigration successfully completed!')
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    await client.close()
  }
}

migrate()
