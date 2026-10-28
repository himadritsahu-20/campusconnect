import { NextResponse } from 'next/server'
import { getUserById } from '@/data/auth'
import { cancelStudentRegistration } from '@/data/registrations'

type RouteContext = { params: { id: string } }

export async function DELETE(request: Request, { params }: RouteContext) {
  const body = await request.json().catch(() => null)
  const user = getUserById(body?.studentId)
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Student access required.' }, { status: 403 })
  }

  const result = cancelStudentRegistration(params.id, user.id)
  if ('error' in result) {
    const status = result.error === 'Registration not found.' ? 404 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ registration: result.registration })
}