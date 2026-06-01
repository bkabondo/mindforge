import { describe, it, expect } from 'vitest'

// Simulated AI response parsing (unit testing the parsing logic)
function parseAIResponse(text: string): Array<{ front: string; back: string }> | null {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

const mockAIResponse = JSON.stringify([
  { front: 'What is photosynthesis?', back: 'The process by which plants convert light into food using sunlight' },
  { front: 'What is chlorophyll?', back: 'The green pigment in plants that captures light energy' },
  { front: 'What is glucose?', back: 'A simple sugar produced during photosynthesis' },
])

describe('Card generation', () => {
  it('parses AI response into cards array', () => {
    const cards = parseAIResponse(mockAIResponse)
    expect(cards).not.toBeNull()
    expect(Array.isArray(cards)).toBe(true)
    expect(cards!.length).toBeGreaterThan(0)
    expect(cards![0]).toHaveProperty('front')
    expect(cards![0]).toHaveProperty('back')
  })

  it('generates cards with non-empty front and back', () => {
    const cards = parseAIResponse(mockAIResponse)
    expect(cards).not.toBeNull()
    for (const card of cards!) {
      expect(card.front.length).toBeGreaterThan(0)
      expect(card.back.length).toBeGreaterThan(0)
    }
  })

  it('extracts JSON from response with surrounding text', () => {
    const text = 'Here are your flashcards: [{"front":"Q1","back":"A1"},{"front":"Q2","back":"A2"}] Hope this helps!'
    const cards = parseAIResponse(text)
    expect(cards).not.toBeNull()
    expect(cards).toHaveLength(2)
  })

  it('returns null for response without JSON array', () => {
    const text = 'I cannot generate flashcards from this text.'
    const result = parseAIResponse(text)
    expect(result).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    const text = '[{front: "Q1", back: "A1"}]' // invalid JSON
    const result = parseAIResponse(text)
    expect(result).toBeNull()
  })
})
