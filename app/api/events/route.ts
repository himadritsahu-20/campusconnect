import { NextResponse } from 'next/server'
import {
  EventInput,
  EventSortMode,
  createEvent,
  events,
  isPastEvent,
  sortEventsByDate,
  sortEventsByNewest,
} from '@/data/events'
import { getUserById } from '@/data/auth'
import {
  sortEventsByRegistrationPopularity,
  sortEventsByRegistrationRate,
} from '@/data/registrations'

const SORTERS = {
  date: sortEventsByDate,
  newest: sortEventsByNewest,
  registrations: sortEventsByRegistrationPopularity,
  'registration-rate': sortEventsByRegistrationRate,
} satisfies Record<EventSortMode, (eventList: typeof events) => typeof events>

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const organizerId = searchParams.get('organizerId')
  const requestedSort = searchParams.get('sort')
  const sortBy = requestedSort && requestedSort in SORTERS
    ? (requestedSort as EventSortMode)
    : 'date'
  const sortEvents = SORTERS[sortBy]

  if (organizerId) {
    const user = getUserById(organizerId)
    if (!user || user.role !== 'organizer') {
      return NextResponse.json({ error: 'Organizer access required.' }, { status: 403 })
    }
    return NextResponse.json({
      events: sortEvents(events.filter((event) => event.organizerId === user.id)),
    })
  }

  return NextResponse.json({
    events: sortEvents(events.filter((event) => !event.cancelled && !isPastEvent(event))),
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const user = getUserById(body?.organizerId)
  if (!user || user.role !== 'organizer') {
    return NextResponse.json({ error: 'Organizer access required.' }, { status: 403 })
  }

  const result = createEvent(body as EventInput, user.id)
  if (typeof result === 'string') {
    return NextResponse.json({ error: result }, { status: 400 })
  }
  return NextResponse.json({ event: result }, { status: 201 })
}