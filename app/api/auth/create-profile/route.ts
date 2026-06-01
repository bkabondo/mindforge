import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin.from('mindforge_users').upsert(
      {
        id: userId,
        email,
        full_name: fullName || '',
        role: 'user',
      },
      { onConflict: 'id' }
    )

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Create profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
