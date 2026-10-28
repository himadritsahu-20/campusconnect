'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import type { CampusEvent } from '@/data/events'
import type { Registration } from '@/data/registrations'
import { isPastEvent } from '@/data/events'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'

type RegistrationWithEvent = Registration & { event: CampusEvent }

export default function RegistrationsPage() {
  const { currentUser } = useAuth()
  const [myRegistrations, setMyRegistrations] = useState<RegistrationWithEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let active = true
    if (currentUser.role !== 'student') {
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)
    fetch(`/api/registrations?studentId=${encodeURIComponent(currentUser.id)}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Could not load registrations.')
        return data
      })
      .then((data) => {
        if (active) setMyRegistrations(data.registrations)
      })
      .catch((error: Error) => {
        if (active) setFeedback(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentUser.id, currentUser.role])

  if (currentUser.role !== 'student') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This page is for students"
          description="Switch to a student account from the top-right menu to see registered events."
        />
      </section>
    )
  }

  const upcoming = myRegistrations.filter((registration) => !isPastEvent(registration.event))
  const past = myRegistrations.filter((registration) => isPastEvent(registration.event))

  async function cancelRegistration(registrationId: string) {
    setFeedback('')
    try {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUser.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Cancellation could not be completed.')
      setMyRegistrations((current) =>
        current.filter((registration) => registration.id !== registrationId),
      )
      setFeedback('Registration cancelled.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Cancellation could not be completed.')
    }
  }

  function renderRegistrations(registrations: RegistrationWithEvent[]) {
    return (
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {registrations.map((reg) => (
          <li
            key={reg.id}
            className="card-surface"
            style={{
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <Link
                href={`/events/${reg.event.id}`}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 17,
                  textDecoration: 'none',
                }}
              >
                {reg.event.name}
              </Link>
              <div
                style={{
                  fontSize: 13.5,
                  color: 'var(--ink-soft)',
                  marginTop: 4,
                }}
              >
                {new Date(reg.event.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                · {reg.event.venue}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusBadge status={isPastEvent(reg.event) ? 'past' : 'open'} />
              {!isPastEvent(reg.event) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => cancelRegistration(reg.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">signed up as {currentUser.name}</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>My registrations</h1>
        <p style={{ marginTop: 8 }}>
          Everything you've registered for. This starter shows seed data —
          separating upcoming from past, and cancelling, are Task 3.
        </p>
      </div>

      {feedback && (
        <p role="status" aria-live="polite" style={{ marginBottom: 16 }}>
          {feedback}
        </p>
      )}
      {loading ? null : myRegistrations.length === 0 ? (
        <EmptyState
          title="No registrations yet"
          description="Once you register for an event, it'll show up here."
          action={
            <Link href="/events" className="btn btn-primary">
              Browse events
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {upcoming.length > 0 && (
            <section>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>Upcoming</h2>
              {renderRegistrations(upcoming)}
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>Past</h2>
              {renderRegistrations(past)}
            </section>
          )}
        </div>
      )}
    </section>
  )
}
