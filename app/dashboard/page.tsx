import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LogoutButton from '@/components/LogoutButton'
import DeckSearch from '@/components/DeckSearch'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('mindforge_users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: decks } = await supabase
    .from('mindforge_decks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get due counts for each deck
  const now = new Date().toISOString()
  const deckIds = (decks || []).map(d => d.id)

  let dueCounts: Record<string, number> = {}
  if (deckIds.length > 0) {
    const { data: dueCards } = await supabase
      .from('mindforge_cards')
      .select('deck_id')
      .in('deck_id', deckIds)
      .lte('next_review', now)

    if (dueCards) {
      for (const card of dueCards) {
        dueCounts[card.deck_id] = (dueCounts[card.deck_id] || 0) + 1
      }
    }
  }

  const totalDue = Object.values(dueCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-sm">MF</div>
            MindForge
          </Link>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && (
              <Link href="/admin" className="text-slate-400 hover:text-white text-sm transition-colors">
                Admin
              </Link>
            )}
            <span className="text-slate-400 text-sm">{profile?.full_name || user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-400">{(decks || []).length}</div>
            <div className="text-slate-400 text-sm">Total Decks</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">
              {(decks || []).reduce((sum, d) => sum + (d.card_count || 0), 0)}
            </div>
            <div className="text-slate-400 text-sm">Total Cards</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-400">{totalDue}</div>
            <div className="text-slate-400 text-sm">Due Today</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">
              {(decks || []).filter(d => dueCounts[d.id] === 0).length}
            </div>
            <div className="text-slate-400 text-sm">Decks Caught Up</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <DeckSearch />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Decks</h1>
            <p className="text-slate-400 text-sm mt-1">
              {totalDue > 0 ? `${totalDue} cards due for review today` : 'All caught up!'}
            </p>
          </div>
          <Link href="/decks/new">
            <Button className="bg-purple-600 hover:bg-purple-700">
              + New Deck
            </Button>
          </Link>
        </div>

        {/* Deck Grid */}
        {(decks || []).length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-white mb-2">No decks yet</h2>
            <p className="mb-6">Create your first deck by pasting any text and letting AI generate flashcards.</p>
            <Link href="/decks/new">
              <Button className="bg-purple-600 hover:bg-purple-700">Create Your First Deck</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(decks || []).map((deck) => {
              const dueCount = dueCounts[deck.id] || 0
              return (
                <Card key={deck.id} className="bg-slate-800/50 border-slate-700/50 text-white hover:border-purple-500/50 transition-all hover:scale-[1.02]">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-tight">{deck.name}</CardTitle>
                      {dueCount > 0 && (
                        <Badge className="bg-orange-600 text-white text-xs ml-2 shrink-0">
                          {dueCount} due
                        </Badge>
                      )}
                    </div>
                    {deck.description && (
                      <CardDescription className="text-slate-400 text-sm line-clamp-2">
                        {deck.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                      <span>{deck.card_count} cards</span>
                      <span>{new Date(deck.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/study/${deck.id}`} className="flex-1">
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                          disabled={dueCount === 0}
                        >
                          {dueCount > 0 ? `Study (${dueCount})` : 'All done!'}
                        </Button>
                      </Link>
                      <Link href={`/decks/${deck.id}`}>
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
