'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import {
  CampusEvent,
  getEventById,
  isPastEvent,
  isFullEvent,
} from '@/data/events'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function EventDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { currentUser } = useAuth()
  const [event, setEvent] = useState<CampusEvent | undefined>(() =>
    getEventById(params.id),
  )
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    const eventsUrl = currentUser.role === 'organizer'
      ? `/api/events?organizerId=${encodeURIComponent(currentUser.id)}`
      : '/api/events'
    fetch(eventsUrl)
      .then((response) => response.json())
      .then((data) => {
        if (active && Array.isArray(data.events)) {
          setEvent(data.events.find((item: CampusEvent) => item.id === params.id))
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [currentUser.id, currentUser.role, params.id])

  async function handleRegister(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    if (currentUser.role !== 'student') {
      setFeedback('Only students can register for events.')
      return
    }
    if (!event) return

    setSubmitting(true)
    setFeedback('')
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, studentId: currentUser.id }),
      })
      const data = await response.json()
      if (!response.ok) {
        setFeedback(data.error ?? 'Registration could not be completed.')
      } else {
        setEvent((current) =>
          current ? { ...current, seatsAvailable: current.seatsAvailable - 1 } : current,
        )
        setFeedback('Registration successful.')
      }
    } catch {
      setFeedback('Registration could not be completed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!event) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This event isn't on the board"
          description="It may have been removed, or the link might be wrong. Head back to the full listing to find what you're looking for."
          action={
            <Link href="/events" className="btn btn-primary">
              Back to events
            </Link>
          }
        />
      </section>
    )
  }

  if (event.cancelled && currentUser.role === 'student') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This event isn't on the board"
          description="It may have been removed, or the link might be wrong. Head back to the full listing to find what you're looking for."
          action={
            <Link href="/events" className="btn btn-primary">
              Back to events
            </Link>
          }
        />
      </section>
    )
  }

  const past = isPastEvent(event)
  const full = isFullEvent(event)
  const status = event.cancelled
    ? 'cancelled'
    : past
      ? 'past'
      : full
        ? 'full'
        : 'open'
  const canRegister = !past && !full && !event.cancelled

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <Link
        href="/events"
        style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
      >
        ← All events
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 32,
          marginTop: 20,
        }}
        className="hero-grid"
      >
        <div>
          <span className="eyebrow-tag">{event.category}</span>
          <h1 style={{ fontSize: 32, marginTop: 12 }}>{event.name}</h1>
          <p style={{ marginTop: 16, fontSize: 15.5 }}>{event.description}</p>
        </div>

        <aside
          className="card-surface"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: 'fit-content',
          }}
        >
          <StatusBadge status={status} />
          <Detail label="Date" value={formatDate(event.date)} />
          <Detail label="Time" value={formatTime(event.date)} />
          <Detail label="Venue" value={event.venue} />
          <Detail
            label="Seats"
            value={`${event.seatsAvailable} of ${event.capacity} available`}
          />

          <form onSubmit={handleRegister} style={{ display: 'grid', gap: 8 }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!canRegister || submitting}
              style={{ marginTop: 4 }}
            >
              {submitting
                ? 'Registering…'
                : canRegister
                  ? 'Register'
                  : status === 'full'
                    ? 'Event full'
                    : 'Registration closed'}
            </button>
            {feedback && (
              <p role="status" aria-live="polite" style={{ fontSize: 13.5 }}>
                {feedback}
              </p>
            )}
          </form>
        </aside>
      </div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
