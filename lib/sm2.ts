export function sm2(quality: number, repetitions: number, interval: number, easeFactor: number) {
  if (quality >= 3) {
    const newInterval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(interval * easeFactor)
    const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    return { interval: newInterval, repetitions: repetitions + 1, easeFactor: newEF }
  }
  return { interval: 1, repetitions: 0, easeFactor: Math.max(1.3, easeFactor - 0.2) }
}
