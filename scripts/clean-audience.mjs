import { MongoClient } from 'mongodb'

async function inspectAndCleanServices() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not found')

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db('bok_bok')

  const services = await db.collection('services').find({}).toArray()
  console.log(`Total services found: ${services.length}\n`)

  let updatedCount = 0

  for (const s of services) {
    let en = s.intendedAudience?.en || ''
    let ar = s.intendedAudience?.ar || ''

    let changed = false

    // Patterns to remove
    // "Adults (18+): " or "Adults (18+) - " or "Adults (18+):"
    const enCleaned = en
      .replace(/^Adults\s*\(\s*18\+\s*\)\s*[:\-–]?\s*/i, '')
      .trim()

    // "البالغون (18+): " or "البالغين (18+): " or "البالغون (18+) - " etc.
    const arCleaned = ar
      .replace(/^(البالغون|البالغين)\s*\(\s*18\+\s*\)\s*[:\-–]?\s*/u, '')
      .trim()

    if (enCleaned !== en || arCleaned !== ar) {
      console.log(`Service ${s._id} (${s.title?.en}):`)
      console.log(`  BEFORE EN: "${en}"`)
      console.log(`  AFTER  EN: "${enCleaned}"`)
      console.log(`  BEFORE AR: "${ar}"`)
      console.log(`  AFTER  AR: "${arCleaned}"`)

      await db.collection('services').updateOne(
        { _id: s._id },
        {
          $set: {
            'intendedAudience.en': enCleaned,
            'intendedAudience.ar': arCleaned,
          },
        }
      )
      updatedCount++
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} services in MongoDB.`)
  await client.close()
}

inspectAndCleanServices().catch(console.error)

