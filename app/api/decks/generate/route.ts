import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, sourceText } = await request.json()

    if (!name || !sourceText) {
      return NextResponse.json({ error: 'Name and source text are required' }, { status: 400 })
    }

    // Generate flashcards with Claude
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Generate flashcards from this text. Return ONLY a JSON array with no markdown, no explanation, just the raw JSON array: [{"front":"question","back":"answer"}]

Generate 10-15 high-quality flashcards covering the key concepts, definitions, and important facts from this text:

${sourceText}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Invalid response from AI' }, { status: 500 })
    }

    let cards: Array<{ front: string; back: string }>
    try {
      // Extract JSON from response
      const text = content.text.trim()
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }
      cards = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Response:', content.text)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: 'No cards generated' }, { status: 500 })
    }

    // Create deck
    const { data: deck, error: deckError } = await supabase
      .from('mindforge_decks')
      .insert({
        user_id: user.id,
        name,
        description: description || '',
        source_text: sourceText,
        card_count: cards.length,
      })
      .select()
      .single()

    if (deckError) {
      console.error('Deck creation error:', deckError)
      return NextResponse.json({ error: deckError.message }, { status: 500 })
    }

    // Create cards
    const cardRows = cards.map((card) => ({
      deck_id: deck.id,
      user_id: user.id,
      front: card.front,
      back: card.back,
      difficulty: 2.5,
      interval: 1,
      repetitions: 0,
      next_review: new Date().toISOString(),
    }))

    const { error: cardsError } = await supabase.from('mindforge_cards').insert(cardRows)

    if (cardsError) {
      console.error('Cards creation error:', cardsError)
      return NextResponse.json({ error: cardsError.message }, { status: 500 })
    }

    return NextResponse.json({ deckId: deck.id, cardCount: cards.length })
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
