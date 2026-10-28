import { NextResponse } from 'next/server'
import { getUserById } from '@/data/auth'
import { getEventById } from '@/data/events'
import { getRegistrationsForStudent, registerStudent } from '@/data/registrations'

export async function GET(request: Request) {
  const studentId = new URL(request.url).searchParams.get('studentId')
  const user = studentId ? getUserById(studentId) : undefined
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Student access required.' }, { status: 403 })
  }

  const registrations = getRegistrationsForStudent(user.id).map((registration) => ({
    ...registration,
    event: getEventById(registration.eventId),
  }))
  return NextResponse.json({ registrations })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const user = getUserById(body?.studentId)
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Student access required.' }, { status: 403 })
  }

  const result = registerStudent(body?.eventId, user.id)
  if ('error' in result) {
    const status = result.error.includes('already registered') || result.error.includes('full')
      ? 409
      : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  console.info('[registration] confirmed', {
    registrationId: result.registration.id,
    eventId: result.registration.eventId,
    studentId: result.registration.studentId,
    registeredAt: result.registration.registeredAt,
  })
  return NextResponse.json({ registration: result.registration }, { status: 201 })
}