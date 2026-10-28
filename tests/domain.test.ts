import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CampusEvent,
  EventInput,
  createEvent,
  events,
  filterEventsByCategory,
  isPastEvent,
  searchEventsByName,
  sortEventsByDate,
  sortEventsByNewest,
  updateEvent,
} from '@/data/events'
import {
  cancelEventRegistrations,
  cancelStudentRegistration,
  getRegistrationsForStudent,
  registerStudent,
  registrations,
  sortEventsByRegistrationPopularity,
  sortEventsByRegistrationRate,
} from '@/data/registrations'

const eventInput: EventInput = {
  name: 'Domain Test Event',
  description: 'Test event',
  date: '2030-10-10T10:00',
  venue: 'Test Hall',
  category: 'Tech',
  capacity: 10,
}

let testEvent: CampusEvent

beforeEach(() => {
  const created = createEvent(eventInput, 'org-1')
  if (typeof created === 'string') throw new Error(created)
  testEvent = created
})

afterEach(() => {
  for (let index = registrations.length - 1; index >= 0; index -= 1) {
    if (registrations[index].eventId === testEvent.id) registrations.splice(index, 1)
  }
  const eventIndex = events.findIndex((event) => event.id === testEvent.id)
  if (eventIndex >= 0) events.splice(eventIndex, 1)
})

describe('event listing helpers', () => {
  it('compares event dates against the current system clock', () => {
    const minute = 60 * 1000
    const pastEvent = {
      ...testEvent,
      date: new Date(Date.now() - minute).toISOString(),
    }
    const upcomingEvent = {
      ...testEvent,
      date: new Date(Date.now() + minute).toISOString(),
    }

    expect(isPastEvent(pastEvent)).toBe(true)
    expect(isPastEvent(upcomingEvent)).toBe(false)
  })

  it('searches partial names without case sensitivity and composes with category filtering', () => {
    const techEvents = filterEventsByCategory(events, 'Tech')
    expect(searchEventsByName(techEvents, 'HACK').map((event) => event.id)).toEqual([
      'evt-01',
    ])
    expect(filterEventsByCategory(events, 'All')).toBe(events)
    expect(searchEventsByName(events, '   ')).toBe(events)
  })

  it('sorts by date, occupied seats, and occupied-seat percentage', () => {
    const earlierEvent = events.find((event) => event.id === 'evt-05')!
    const popularEvent = events.find((event) => event.id === 'evt-09')!
    const emptyEvent = events.find((event) => event.id === 'evt-06')!
    registerStudent(testEvent.id, 'stu-2')

    expect(sortEventsByDate([testEvent, earlierEvent]).map((event) => event.id)).toEqual([
      earlierEvent.id,
      testEvent.id,
    ])
    expect(sortEventsByNewest([testEvent, earlierEvent]).map((event) => event.id)).toEqual([
      testEvent.id,
      earlierEvent.id,
    ])
    expect(
      sortEventsByRegistrationPopularity([
        testEvent,
        earlierEvent,
        popularEvent,
        emptyEvent,
      ]).map((event) => event.id),
    ).toEqual([popularEvent.id, earlierEvent.id, testEvent.id, emptyEvent.id])
    expect(
      sortEventsByRegistrationRate([
        testEvent,
        earlierEvent,
        popularEvent,
        emptyEvent,
      ]).map((event) => event.id),
    ).toEqual([earlierEvent.id, popularEvent.id, testEvent.id, emptyEvent.id])
  })
})

describe('registration lifecycle', () => {
  it('prevents duplicate and full registrations without changing seats', () => {
    const first = registerStudent(testEvent.id, 'stu-1')
    expect('error' in first).toBe(false)
    expect(testEvent.seatsAvailable).toBe(9)

    const duplicate = registerStudent(testEvent.id, 'stu-1')
    expect('error' in duplicate && duplicate.error).toContain('already registered')
    expect(testEvent.seatsAvailable).toBe(9)

    testEvent.seatsAvailable = 0
    const full = registerStudent(testEvent.id, 'stu-2')
    expect('error' in full && full.error).toContain('full')
    expect(testEvent.seatsAvailable).toBe(0)
  })

  it('blocks registration for past or cancelled events', () => {
    testEvent.date = '2000-01-01T10:00:00'
    const past = registerStudent(testEvent.id, 'stu-1')
    expect('error' in past && past.error).toContain('closed')
    expect(testEvent.seatsAvailable).toBe(10)

    testEvent.date = eventInput.date
    testEvent.cancelled = true
    const cancelled = registerStudent(testEvent.id, 'stu-1')
    expect('error' in cancelled && cancelled.error).toContain('unavailable')
    expect(testEvent.seatsAvailable).toBe(10)
  })

  it('restores a seat once on cancellation and hides cancelled registrations', () => {
    const registered = registerStudent(testEvent.id, 'stu-1')
    if ('error' in registered) throw new Error(registered.error)
    expect(testEvent.seatsAvailable).toBe(9)

    const cancelled = cancelStudentRegistration(registered.registration.id, 'stu-1')
    expect('error' in cancelled).toBe(false)
    expect(testEvent.seatsAvailable).toBe(10)
    expect(getRegistrationsForStudent('stu-1')).not.toContainEqual(
      expect.objectContaining({ id: registered.registration.id }),
    )

    cancelStudentRegistration(registered.registration.id, 'stu-1')
    expect(testEvent.seatsAvailable).toBe(10)
  })

  it('does not cancel registrations for past events or restore their seats', () => {
    testEvent.date = new Date(Date.now() - 60_000).toISOString()
    testEvent.seatsAvailable = 9
    const registration = {
      id: 'past-event-registration',
      eventId: testEvent.id,
      studentId: 'stu-1',
      status: 'confirmed' as const,
      registeredAt: new Date().toISOString(),
    }
    registrations.push(registration)

    const result = cancelStudentRegistration(registration.id, 'stu-1')

    expect('error' in result && result.error).toContain('Past event')
    expect(registration.status).toBe('confirmed')
    expect(testEvent.seatsAvailable).toBe(9)
  })

  it('reuses a cancelled registration instead of creating a duplicate', () => {
    const first = registerStudent(testEvent.id, 'stu-1')
    if ('error' in first) throw new Error(first.error)
    cancelStudentRegistration(first.registration.id, 'stu-1')
    const again = registerStudent(testEvent.id, 'stu-1')

    expect('error' in again).toBe(false)
    if ('error' in again) return
    expect(again.registration.id).toBe(first.registration.id)
    expect(registrations.filter((registration) => registration.eventId === testEvent.id)).toHaveLength(1)
    expect(testEvent.seatsAvailable).toBe(9)
  })

  it('hides registrations for cancelled events and releases occupied seats', () => {
    const registered = registerStudent(testEvent.id, 'stu-1')
    expect('error' in registered).toBe(false)
    cancelEventRegistrations(testEvent.id)

    expect(testEvent.seatsAvailable).toBe(10)
    expect(getRegistrationsForStudent('stu-1')).not.toContainEqual(
      expect.objectContaining({ eventId: testEvent.id }),
    )
  })
})

describe('organizer event edits', () => {
  it('validates required fields and preserves occupied seats when capacity changes', () => {
    expect(createEvent({ ...eventInput, name: '  ' }, 'org-1')).toEqual(
      'Event name is required.',
    )
    testEvent.seatsAvailable = 8

    const tooSmall = updateEvent(
      testEvent.id,
      { ...eventInput, capacity: 1 },
      'org-1',
    )
    expect(tooSmall).toContain('Capacity cannot be lower')

    const updated = updateEvent(
      testEvent.id,
      { ...eventInput, capacity: 20 },
      'org-1',
    )
    expect(typeof updated).not.toBe('string')
    expect(testEvent.seatsAvailable).toBe(18)
  })
})