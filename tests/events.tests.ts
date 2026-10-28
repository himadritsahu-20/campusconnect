import { describe, it, expect } from 'vitest'
import { events, isPastEvent } from '@/data/events'

describe('isPastEvent', () => {
  it('marks an event with a date before the system clock as past', () => {
    // evt-10 is dated 2026-09-01.
    const pastEvent = events.find((e) => e.id === 'evt-10')!
    expect(isPastEvent(pastEvent)).toBe(true)
  })
})
