// Seed data for registrations, so the "My Registrations" and Organizer
// pages have something real to display before participants build the
// actual registration flow (Task 2 and Task 3).

import type { CampusEvent } from '@/data/events'
import { getEventById, isFullEvent, isPastEvent } from '@/data/events'

export type RegistrationStatus = 'confirmed' | 'cancelled'

export interface Registration {
  id: string
  eventId: string
  studentId: string
  status: RegistrationStatus
  registeredAt: string // ISO date string
}

// NOTE FOR PARTICIPANTS: this array is the "database" of registrations.
// Task 2 (Registration) means pushing new items into this array when a
// student registers. Task 3 (Cancellation) means updating an item's
// status here. Keep using this same array — don't create a second store.
const seededRegistrations: Registration[] = [
  {
    id: 'reg-01',
    eventId: 'evt-01',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-10T10:15:00',
  },
  {
    id: 'reg-02',
    eventId: 'evt-04',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-08-20T09:00:00',
  },
  {
    id: 'reg-03',
    eventId: 'evt-09',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-12T18:40:00',
  },
]

const registrationStore = globalThis as typeof globalThis & {
  campusConnectRegistrations?: Registration[]
}

export const registrations =
  (registrationStore.campusConnectRegistrations ??= seededRegistrations)

function getOccupiedSeats(event: CampusEvent): number {
  return Math.max(0, event.capacity - event.seatsAvailable)
}

export function sortEventsByRegistrationPopularity(
  eventList: CampusEvent[],
): CampusEvent[] {
  return [...eventList].sort((left, right) => {
    const popularityDifference = getOccupiedSeats(right) - getOccupiedSeats(left)
    if (popularityDifference !== 0) return popularityDifference
    return new Date(left.date).getTime() - new Date(right.date).getTime()
  })
}

export function sortEventsByRegistrationRate(eventList: CampusEvent[]): CampusEvent[] {
  return [...eventList].sort((left, right) => {
    const leftCount = getOccupiedSeats(left)
    const rightCount = getOccupiedSeats(right)
    const leftRate = left.capacity > 0 ? leftCount / left.capacity : 0
    const rightRate = right.capacity > 0 ? rightCount / right.capacity : 0
    const rateDifference = rightRate - leftRate

    if (rateDifference !== 0) return rateDifference
    if (rightCount !== leftCount) return rightCount - leftCount
    return new Date(left.date).getTime() - new Date(right.date).getTime()
  })
}

/** Simple lookup used by the placeholder "My Registrations" page. */
export function getRegistrationsForStudent(studentId: string): Registration[] {
  return registrations.filter((reg) => {
    const event = getEventById(reg.eventId)
    return (
      reg.studentId === studentId &&
      reg.status === 'confirmed' &&
      event !== undefined &&
      !event.cancelled
    )
  })
}

type RegistrationResult =
  | { registration: Registration }
  | { error: string }

export function registerStudent(
  eventId: string,
  studentId: string,
): RegistrationResult {
  const event = getEventById(eventId)
  if (!event || event.cancelled) return { error: 'This event is unavailable.' }
  if (isPastEvent(event)) return { error: 'Registration is closed for past events.' }
  if (isFullEvent(event)) return { error: 'This event is full.' }

  const existing = registrations.find(
    (reg) => reg.eventId === eventId && reg.studentId === studentId,
  )
  if (existing?.status === 'confirmed') {
    return { error: 'You are already registered for this event.' }
  }

  if (existing) {
    existing.status = 'confirmed'
    existing.registeredAt = new Date().toISOString()
    event.seatsAvailable -= 1
    return { registration: existing }
  }

  const registration: Registration = {
    id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventId,
    studentId,
    status: 'confirmed',
    registeredAt: new Date().toISOString(),
  }
  registrations.push(registration)
  event.seatsAvailable -= 1
  return { registration }
}

export function cancelStudentRegistration(
  registrationId: string,
  studentId: string,
): RegistrationResult {
  const registration = registrations.find((reg) => reg.id === registrationId)
  if (!registration || registration.studentId !== studentId) {
    return { error: 'Registration not found.' }
  }
  if (registration.status !== 'confirmed') {
    return { error: 'This registration is already cancelled.' }
  }

  const event = getEventById(registration.eventId)
  if (event && isPastEvent(event)) {
    return { error: 'Past event registrations cannot be cancelled.' }
  }

  registration.status = 'cancelled'
  if (event) event.seatsAvailable = Math.min(event.capacity, event.seatsAvailable + 1)
  return { registration }
}

export function cancelEventRegistrations(eventId: string): void {
  const event = getEventById(eventId)
  let releasedSeats = 0

  for (const registration of registrations) {
    if (registration.eventId === eventId && registration.status === 'confirmed') {
      registration.status = 'cancelled'
      releasedSeats += 1
    }
  }

  if (event) {
    event.seatsAvailable = Math.min(event.capacity, event.seatsAvailable + releasedSeats)
  }
}
