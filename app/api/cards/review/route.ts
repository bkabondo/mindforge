import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sm2 } from '@/lib/sm2'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cardId, quality } = await request.json()

    if (!cardId || quality === undefined) {
      return NextResponse.json({ error: 'Missing cardId or quality' }, { status: 400 })
    }

    if (quality < 1 || quality > 5) {
      return NextResponse.json({ error: 'Quality must be between 1 and 5' }, { status: 400 })
    }

    // Fetch current card data
    const { data: card, error: fetchError } = await supabase
      .from('mindforge_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Apply SM-2 algorithm
    const result = sm2(quality, card.repetitions, card.interval, card.difficulty)

    // Calculate next review date
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + result.interval)

    // Update card
    const { error: updateError } = await supabase
      .from('mindforge_cards')
      .update({
        difficulty: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        next_review: nextReview.toISOString(),
      })
      .eq('id', cardId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Card update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      nextReview: nextReview.toISOString(),
      interval: result.interval,
    })
  } catch (err) {
    console.error('Review error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
