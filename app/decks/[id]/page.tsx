'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Card {
  id: string
  front: string
  back: string
  next_review: string
  repetitions: number
  interval: number
}

interface Deck {
  id: string
  name: string
  description: string
  card_count: number
  created_at: string
}

export default function DeckDetailPage() {
  const params = useParams()
  const deckId = params.id as string
  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: deckData } = await supabase
        .from('mindforge_decks')
        .select('*')
        .eq('id', deckId)
        .single()

      const { data: cardsData } = await supabase
        .from('mindforge_cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true })

      setDeck(deckData)
      setCards(cardsData || [])
      setLoading(false)
    }
    load()
  }, [deckId])

  function toggleFlip(cardId: string) {
    setFlipped(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const [shareEmail, setShareEmail] = useState('')
  const [sharing, setSharing] = useState(false)
  const [showShare, setShowShare] = useState(false)

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    if (!shareEmail.trim()) return
    setSharing(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone'
    const res = await fetch('/api/email/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: shareEmail.trim(), deckName: deck?.name, deckId, cardCount: cards.length, senderName }),
    })
    setSharing(false)
    if (res.ok) { toast.success(`Deck shared with ${shareEmail}!`); setShareEmail(''); setShowShare(false) }
    else { const d = await res.json(); toast.error(d.error || 'Failed to send') }
  }

  const now = new Date()
  const dueCount = cards.filter(c => new Date(c.next_review) <= now).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Deck not found</h1>
          <Link href="/dashboard">
            <Button className="bg-purple-600 hover:bg-purple-700">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      <style>{`
        .card-container { perspective: 1000px; }
        .card { transform-style: preserve-3d; transition: transform 0.6s; cursor: pointer; }
        .card.flipped { transform: rotateY(180deg); }
        .card-front, .card-back { backface-visibility: hidden; position: absolute; width: 100%; height: 100%; }
        .card-back { transform: rotateY(180deg); }
      `}</style>

      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-sm">MF</div>
            MindForge
          </Link>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">{deck.name}</h1>
            {deck.description && <p className="text-slate-400">{deck.description}</p>}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-slate-500 text-sm">{deck.card_count} cards</span>
              {dueCount > 0 && (
                <Badge className="bg-orange-600 text-white text-xs">{dueCount} due today</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShare(s => !s)} className="text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-2 rounded-lg transition-colors">
              Share ↗
            </button>
            <Link href={`/study/${deck.id}`}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                {dueCount > 0 ? `Study Now (${dueCount})` : 'Study All'}
              </Button>
            </Link>
          </div>
        </div>

        {showShare && (
          <form onSubmit={handleShare} className="flex gap-2 mb-6">
            <input
              type="email"
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              placeholder="friend@email.com"
              required
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500"
            />
            <Button type="submit" disabled={sharing} className="bg-purple-600 hover:bg-purple-700 text-sm">
              {sharing ? 'Sending...' : 'Send Invite'}
            </Button>
            <button type="button" onClick={() => setShowShare(false)} className="text-slate-400 hover:text-white px-2">✕</button>
          </form>
        )}

        <p className="text-slate-500 text-sm mb-6">Click any card to reveal the answer.</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const isFlipped = flipped.has(card.id)
            const isDue = new Date(card.next_review) <= now

            return (
              <div key={card.id} className="card-container">
                <div
                  style={{ height: '160px', position: 'relative' }}
                  className={`card ${isFlipped ? 'flipped' : ''}`}
                  onClick={() => toggleFlip(card.id)}
                >
                  <div className="card-front bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-purple-400 uppercase tracking-widest">Question</span>
                      {isDue && <span className="w-2 h-2 bg-orange-500 rounded-full" title="Due for review"></span>}
                    </div>
                    <p className="text-white text-sm font-medium flex-1 flex items-center">{card.front}</p>
                    <p className="text-slate-500 text-xs mt-2">Tap to flip</p>
                  </div>
                  <div className="card-back bg-green-900/30 border border-green-700/50 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-xs text-green-400 uppercase tracking-widest">Answer</span>
                    <p className="text-white text-sm flex-1 flex items-center mt-2">{card.back}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-slate-500 text-xs">Interval: {card.interval}d</span>
                      <span className="text-slate-500 text-xs">{card.repetitions} reviews</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
