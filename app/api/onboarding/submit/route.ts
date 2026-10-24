import { NextResponse } from 'next/server'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const expertId = session.role === 'admin' && body.expertId ? body.expertId : session.expertId

    if (!expertId) {
      return NextResponse.json({ success: false, error: 'No expert ID found' }, { status: 400 })
    }

    const expertObjId = toObjectId(expertId)
    const expertsCol = await getExpertsCollection()

    const expert = await expertsCol.findOne({ _id: expertObjId })
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 })
    }

    if (!expert.image && !expert.avatarUrl) {
      return NextResponse.json(
        { success: false, error: 'Please upload your profile photo before submitting.' },
        { status: 400 }
      )
    }

    if (!expert.nationalIdFrontUrl || !expert.nationalIdBackUrl) {
      return NextResponse.json(
        { success: false, error: 'Please upload both front and back of your National ID before submitting.' },
        { status: 400 }
      )
    }

    await expertsCol.updateOne(
      { _id: expertObjId },
      {
        $set: {
          status: 'pending_review',
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Profile submitted for administrator review.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit onboarding' },
      { status: 500 }
    )
  }
}
