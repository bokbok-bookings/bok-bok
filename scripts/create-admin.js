const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bokbok.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@BokBok2026!'
const ADMIN_NAME = 'Platform Administrator'

async function createAdmin() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    console.log('Connected to MongoDB Atlas...')
    const db = client.db('bok_bok')
    const usersCol = db.collection('users')

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt)

    const existing = await usersCol.findOne({ email: ADMIN_EMAIL.toLowerCase() })

    if (existing) {
      await usersCol.updateOne(
        { _id: existing._id },
        {
          $set: {
            passwordHash,
            displayName: ADMIN_NAME,
            role: 'admin',
            status: 'active',
            updatedAt: new Date(),
          },
        }
      )
      console.log(`Updated existing admin user: ${ADMIN_EMAIL}`)
    } else {
      const adminId = new ObjectId()
      await usersCol.insertOne({
        _id: adminId,
        email: ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        displayName: ADMIN_NAME,
        role: 'admin',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log(`Created new admin user: ${ADMIN_EMAIL} (ID: ${adminId})`)
    }

    // Also link existing seeded experts to their test expert user accounts so pair programming / testing is instant
    const expertsCol = db.collection('experts')
    const seededExperts = await expertsCol.find({}).toArray()
    console.log(`\nEnsuring user accounts for ${seededExperts.length} seeded experts...`)

    const expertPassHash = await bcrypt.hash('Expert123456!', salt)

    for (const exp of seededExperts) {
      const expertEmail = `${exp.slug}@bokbok.test`.toLowerCase()
      const existingUser = await usersCol.findOne({ email: expertEmail })

      let userId = existingUser ? existingUser._id : new ObjectId()

      if (!existingUser) {
        await usersCol.insertOne({
          _id: userId,
          email: expertEmail,
          passwordHash: expertPassHash,
          displayName: exp.name,
          role: 'expert',
          expertId: exp._id,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        console.log(`  ✓ Created user account: ${expertEmail} (Password: Expert123456!)`)
      } else {
        await usersCol.updateOne(
          { _id: existingUser._id },
          { $set: { expertId: exp._id, role: 'expert', status: 'active', updatedAt: new Date() } }
        )
      }

      // Ensure expert document has userId and approved status
      await expertsCol.updateOne(
        { _id: exp._id },
        {
          $set: {
            userId: userId,
            status: exp.status || 'approved',
            updatedAt: new Date(),
          },
        }
      )
    }

    console.log('\n--- ADMIN CREDENTIALS ---')
    console.log(`Email:    ${ADMIN_EMAIL}`)
    console.log(`Password: ${ADMIN_PASSWORD}`)
    console.log(`Role:     admin`)
    console.log('-------------------------\n')
  } finally {
    await client.close()
  }
}

createAdmin().catch(console.error)
