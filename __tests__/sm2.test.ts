import { describe, it, expect } from 'vitest'
import { sm2 } from '../lib/sm2'

describe('SM-2 Algorithm', () => {
  it('resets on low quality (< 3)', () => {
    const result = sm2(2, 5, 10, 2.5)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('sets interval to 1 on first correct repetition', () => {
    const result = sm2(4, 0, 1, 2.5)
    expect(result.interval).toBe(1)
    expect(result.repetitions).toBe(1)
  })

  it('sets interval to 6 on second correct repetition', () => {
    const result = sm2(4, 1, 1, 2.5)
    expect(result.interval).toBe(6)
    expect(result.repetitions).toBe(2)
  })

  it('multiplies interval by ease factor on subsequent repetitions', () => {
    const ef = 2.5
    const interval = 6
    const result = sm2(4, 2, interval, ef)
    expect(result.interval).toBe(Math.round(interval * ef))
    expect(result.repetitions).toBe(3)
  })

  it('increases ease factor on quality 5', () => {
    const result = sm2(5, 3, 10, 2.5)
    expect(result.easeFactor).toBeGreaterThan(2.5)
  })

  it('decreases ease factor on quality 3', () => {
    const result = sm2(3, 3, 10, 2.5)
    expect(result.easeFactor).toBeLessThan(2.5)
  })

  it('never lets ease factor go below 1.3', () => {
    const result = sm2(1, 0, 1, 1.3)
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('processes quality 3 as passing', () => {
    const result = sm2(3, 0, 1, 2.5)
    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(1)
  })
})
