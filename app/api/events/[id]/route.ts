import { NextResponse } from 'next/server'
import { EventInput, cancelEvent, updateEvent } from '@/data/events'
import { getUserById } from '@/data/auth'
import { cancelEventRegistrations } from '@/data/registrations'

type RouteContext = { params: { id: string } }

export async function PATCH(request: Request, { params }: RouteContext) {
  const body = await request.json().catch(() => null)
  const user = getUserById(body?.organizerId)
  if (!user || user.role !== 'organizer') {
    return NextResponse.json({ error: 'Organizer access required.' }, { status: 403 })
  }

  const result = updateEvent(params.id, body as EventInput, user.id)
  if (typeof result === 'string') {
    const status = result === 'Event not found.' ? 404 : 400
    return NextResponse.json({ error: result }, { status })
  }
  return NextResponse.json({ event: result })
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const body = await request.json().catch(() => null)
  const user = getUserById(body?.organizerId)
  if (!user || user.role !== 'organizer') {
    return NextResponse.json({ error: 'Organizer access required.' }, { status: 403 })
  }

  const result = cancelEvent(params.id, user.id)
  if (typeof result === 'string') {
    const status = result === 'Event not found.' ? 404 : 400
    return NextResponse.json({ error: result }, { status })
  }
  cancelEventRegistrations(result.id)
  return NextResponse.json({ event: result })
}