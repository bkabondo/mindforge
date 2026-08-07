'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Deck { id: string; name: string; description?: string }
interface Card { id: string; deck_id: string; front: string; back: string }

export default function DeckSearch() {
  const [query, setQuery] = useState('')
  const [decks, setDecks] = useState<Deck[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setDecks([]); setCards([]); setOpen(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const q = query.trim()

      const [{ data: deckResults }, { data: cardResults }] = await Promise.all([
        supabase.from('mindforge_decks').select('id,name,description').ilike('name', `%${q}%`).limit(5),
        supabase.from('mindforge_cards').select('id,deck_id,front,back').or(`front.ilike.%${q}%,back.ilike.%${q}%`).limit(8),
      ])

      setDecks(deckResults || [])
      setCards(cardResults || [])
      setOpen(true)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const hasResults = decks.length > 0 || cards.length > 0

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search decks and flashcards..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 text-sm"
        />
        <svg className="absolute left-3 top-3 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && <div className="absolute right-3 top-3 h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {open && hasResults && (
        <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {decks.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">Decks</div>
              {decks.map(d => (
                <Link key={d.id} href={`/decks/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors">
                  <span className="text-lg">📚</span>
                  <div>
                    <p className="text-white text-sm font-medium">{d.name}</p>
                    {d.description && <p className="text-slate-400 text-xs truncate">{d.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
          {cards.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">Flashcards</div>
              {cards.map(c => (
                <Link key={c.id} href={`/decks/${c.deck_id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700 transition-colors">
                  <span className="text-lg">🃏</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{c.front}</p>
                    <p className="text-slate-400 text-xs truncate">{c.back}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {open && !hasResults && query.trim() && !loading && (
        <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 px-4 py-6 text-center text-slate-400 text-sm">
          No decks or cards matching &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}
