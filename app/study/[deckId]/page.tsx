'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface Card {
  id: string
  front: string
  back: string
  next_review: string
  repetitions: number
  interval: number
  difficulty: number
}

export default function StudyPage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.deckId as string

  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [completed, setCompleted] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const now = new Date().toISOString()

      const { data: deckData } = await supabase
        .from('mindforge_decks')
        .select('name')
        .eq('id', deckId)
        .single()

      if (deckData) setDeckName(deckData.name)

      const { data: cardsData } = await supabase
        .from('mindforge_cards')
        .select('*')
        .eq('deck_id', deckId)
        .lte('next_review', now)
        .order('next_review', { ascending: true })

      setCards(cardsData || [])
      setLoading(false)
    }
    load()
  }, [deckId])

  async function handleRate(quality: number) {
    if (reviewing || cards.length === 0) return
    setReviewing(true)

    const card = cards[currentIndex]

    try {
      await fetch('/api/cards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, quality }),
      })
    } catch (err) {
      console.error('Review error:', err)
    }

    setCompleted(prev => prev + 1)
    setFlipped(false)

    if (currentIndex + 1 >= cards.length) {
      // Done
      setCurrentIndex(cards.length)
    } else {
      setCurrentIndex(prev => prev + 1)
    }

    setReviewing(false)
  }

  const progress = cards.length > 0 ? (completed / cards.length) * 100 : 0
  const isDone = cards.length > 0 && currentIndex >= cards.length
  const currentCard = cards[currentIndex]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      <style>{`
        .study-card-container { perspective: 1000px; }
        .study-card { transform-style: preserve-3d; transition: transform 0.6s; }
        .study-card.flipped { transform: rotateY(180deg); }
        .study-card-front, .study-card-back { backface-visibility: hidden; }
        .study-card-back { transform: rotateY(180deg); }
      `}</style>

      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={`/decks/${deckId}`} className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-sm">MF</div>
            MindForge
          </Link>
          <Link href={`/decks/${deckId}`} className="text-slate-400 hover:text-white text-sm transition-colors">
            Exit Study
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">{deckName}</h1>
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>{completed} / {cards.length} reviewed</span>
            <span>{cards.length - completed} remaining</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-700" />
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">No cards due!</h2>
            <p className="text-slate-400 mb-6">All cards in this deck are scheduled for future review. Check back later!</p>
            <Link href={`/decks/${deckId}`}>
              <Button className="bg-purple-600 hover:bg-purple-700">View Deck</Button>
            </Link>
          </div>
        ) : isDone ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-slate-400 mb-6">You reviewed all {completed} cards. Great work!</p>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard">
                <Button className="bg-purple-600 hover:bg-purple-700">Back to Dashboard</Button>
              </Link>
              <Link href={`/decks/${deckId}`}>
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  View Deck
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Card */}
            <div className="study-card-container mb-6">
              <div
                className={`study-card relative cursor-pointer`}
                style={{ height: '280px' }}
                onClick={() => !flipped && setFlipped(true)}
              >
                <div
                  className="study-card-front absolute inset-0 bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col justify-between"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-400 uppercase tracking-widest">Question</span>
                    <span className="text-xs text-slate-500">Card {currentIndex + 1} of {cards.length}</span>
                  </div>
                  <p className="text-white text-xl font-medium text-center flex-1 flex items-center justify-center">
                    {currentCard?.front}
                  </p>
                  {!flipped && (
                    <p className="text-slate-500 text-sm text-center">Click to reveal answer</p>
                  )}
                </div>
                <div
                  className="study-card-back absolute inset-0 bg-indigo-900/40 border border-indigo-600/50 rounded-2xl p-8 flex flex-col justify-between"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="text-xs text-indigo-400 uppercase tracking-widest">Answer</span>
                  <p className="text-white text-lg text-center flex-1 flex items-center justify-center">
                    {currentCard?.back}
                  </p>
                  <span className="text-slate-500 text-xs text-center">Rate your confidence below</span>
                </div>
              </div>
            </div>

            {/* Manually handle flip state */}
            {!flipped ? (
              <div className="text-center">
                <Button
                  onClick={() => setFlipped(true)}
                  className="bg-slate-700 hover:bg-slate-600 px-10"
                >
                  Show Answer
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-center text-slate-400 text-sm mb-4">How well did you know this?</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { quality: 1, label: 'Blackout', color: 'bg-red-700 hover:bg-red-600', desc: 'No recall' },
                    { quality: 2, label: 'Wrong', color: 'bg-orange-700 hover:bg-orange-600', desc: 'Incorrect' },
                    { quality: 3, label: 'Hard', color: 'bg-yellow-700 hover:bg-yellow-600', desc: 'With effort' },
                    { quality: 4, label: 'Good', color: 'bg-blue-700 hover:bg-blue-600', desc: 'Correct' },
                    { quality: 5, label: 'Easy', color: 'bg-green-700 hover:bg-green-600', desc: 'Perfect' },
                  ].map(({ quality, label, color, desc }) => (
                    <button
                      key={quality}
                      onClick={() => handleRate(quality)}
                      disabled={reviewing}
                      className={`${color} text-white rounded-xl py-3 px-2 text-center transition-all hover:scale-105 disabled:opacity-50`}
                    >
                      <div className="font-bold text-sm">{label}</div>
                      <div className="text-xs opacity-75">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
