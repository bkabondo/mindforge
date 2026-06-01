import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if admin
  const { data: profile } = await supabase
    .from('mindforge_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">You do not have permission to view this page.</p>
          <Link href="/dashboard" className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Fetch all users using admin client
  const admin = createAdminClient()
  const { data: allUsers } = await admin
    .from('mindforge_users')
    .select('*')
    .order('created_at', { ascending: false })

  const userIds = (allUsers || []).map(u => u.id)

  // Fetch deck stats
  const { data: allDecks } = await admin
    .from('mindforge_decks')
    .select('user_id, card_count')

  // Fetch card stats
  const { data: allCards } = await admin
    .from('mindforge_cards')
    .select('user_id, next_review')

  const now = new Date().toISOString()

  // Compute per-user stats
  const decksByUser: Record<string, number> = {}
  const cardsByUser: Record<string, number> = {}
  const dueByUser: Record<string, number> = {}

  for (const deck of allDecks || []) {
    decksByUser[deck.user_id] = (decksByUser[deck.user_id] || 0) + 1
  }
  for (const card of allCards || []) {
    cardsByUser[card.user_id] = (cardsByUser[card.user_id] || 0) + 1
    if (card.next_review <= now) {
      dueByUser[card.user_id] = (dueByUser[card.user_id] || 0) + 1
    }
  }

  const totalDecks = (allDecks || []).length
  const totalCards = (allCards || []).length
  const totalDue = (allCards || []).filter(c => c.next_review <= now).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-sm">MF</div>
            MindForge
          </Link>
          <div className="flex items-center gap-4">
            <Badge className="bg-purple-700 text-white">Admin</Badge>
            <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm">Dashboard</Link>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700/50 text-white">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-400">{(allUsers || []).length}</div>
              <div className="text-slate-400 text-sm mt-1">Total Users</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 text-white">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-400">{totalDecks}</div>
              <div className="text-slate-400 text-sm mt-1">Total Decks</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 text-white">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-400">{totalCards}</div>
              <div className="text-slate-400 text-sm mt-1">Total Cards</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 text-white">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-400">{totalDue}</div>
              <div className="text-slate-400 text-sm mt-1">Cards Due Today</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="bg-slate-800/50 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Role</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Decks</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Cards</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Due</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(allUsers || []).map((u) => (
                    <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{u.full_name || '—'}</div>
                        <div className="text-slate-400 text-xs">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={u.role === 'admin' ? 'bg-purple-700 text-white' : 'bg-slate-700 text-slate-300'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{decksByUser[u.id] || 0}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{cardsByUser[u.id] || 0}</td>
                      <td className="py-3 px-4 text-right">
                        {dueByUser[u.id] ? (
                          <span className="text-orange-400">{dueByUser[u.id]}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
