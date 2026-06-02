import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const ACCOUNTS = [
  { email: 'kabondobenjamin1@gmail.com', password: 'Admin@Kabondo123!', full_name: 'Benjamin Kabondo', role: 'admin' },
  { email: 'testuser1@proj.com', password: 'TestUser1@123', full_name: 'Alice Johnson', role: 'user' },
  { email: 'testuser2@proj.com', password: 'TestUser2@123', full_name: 'Bob Smith', role: 'user' },
  { email: 'testuser3@proj.com', password: 'TestUser3@123', full_name: 'Carol Davis', role: 'user' },
]

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: { users: existing } } = await admin.auth.admin.listUsers()
  const results: string[] = []

  for (const acc of ACCOUNTS) {
    let uid = existing.find((u) => u.email === acc.email)?.id
    if (!uid) {
      const { data, error } = await admin.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.full_name },
      })
      if (error) { results.push(`${acc.email}: ERROR ${error.message}`); continue }
      uid = data.user.id
    }
    const { error: upsertErr } = await admin
      .from('mindforge_users')
      .upsert({ id: uid, email: acc.email, full_name: acc.full_name, role: acc.role }, { onConflict: 'id' })
    results.push(`${acc.email}: ${upsertErr ? 'ERROR ' + upsertErr.message : 'OK'}`)
  }

  return NextResponse.json({ seeded: results })
}
