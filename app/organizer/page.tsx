'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import type { CampusEvent, EventInput } from '@/data/events'
import { events } from '@/data/events'
import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'

const CATEGORIES: EventInput['category'][] = [
  'Tech',
  'Cultural',
  'Sports',
  'Workshop',
  'Career',
  'Music',
]

const EMPTY_FORM: EventInput = {
  name: '',
  description: '',
  date: '',
  venue: '',
  category: 'Tech',
  capacity: 30,
}

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid var(--line)',
  borderRadius: 'var(--radius)',
  font: 'inherit',
  background: 'var(--paper-raised)',
}

function toLocalInputValue(value: string) {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function OrganizerPage() {
  const { currentUser } = useAuth()
  const [eventList, setEventList] = useState(events)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null)
  const [form, setForm] = useState<EventInput>(EMPTY_FORM)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    if (currentUser.role !== 'organizer') {
      return () => {
        active = false
      }
    }

    fetch(`/api/events?organizerId=${encodeURIComponent(currentUser.id)}`)
      .then((response) => response.json())
      .then((data) => {
        if (active && Array.isArray(data.events)) setEventList(data.events)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [currentUser.id])

  if (currentUser.role !== 'organizer') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This page is for organizers"
          description="Switch to an organizer account from the top-right menu to manage events."
        />
      </section>
    )
  }

  const myEvents = eventList.filter((event) => event.organizerId === currentUser.id)

  function startCreate() {
    setEditingEvent(null)
    setForm(EMPTY_FORM)
    setFeedback('')
    setFormOpen(true)
  }

  function startEdit(event: CampusEvent) {
    setEditingEvent(event)
    setForm({
      name: event.name,
      description: event.description,
      date: toLocalInputValue(event.date),
      venue: event.venue,
      category: event.category,
      capacity: event.capacity,
    })
    setFeedback('')
    setFormOpen(true)
  }

  async function saveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFeedback('')
    const isEditing = editingEvent !== null
    try {
      const response = await fetch(
        isEditing ? `/api/events/${editingEvent.id}` : '/api/events',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, organizerId: currentUser.id }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Event could not be saved.')
      setEventList((current) =>
        isEditing
          ? current.map((item) => (item.id === data.event.id ? data.event : item))
          : [...current, data.event],
      )
      setFormOpen(false)
      setFeedback(isEditing ? 'Event updated.' : 'Event created.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Event could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function cancelManagedEvent(event: CampusEvent) {
    setFeedback('')
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerId: currentUser.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Event could not be cancelled.')
      setEventList((current) =>
        current.map((item) => (item.id === data.event.id ? data.event : item)),
      )
      setFeedback('Event cancelled.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Event could not be cancelled.')
    }
  }

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div
        style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <span className="eyebrow-tag">organizer console</span>
          <h1 style={{ fontSize: 30, marginTop: 10 }}>Manage your events</h1>
          <p style={{ marginTop: 8 }}>
            This starter shows your seeded events — creating, editing, and
            cancelling are Task 4.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={startCreate}
        >
          + New event
        </button>
      </div>

      {feedback && (
        <p role="status" aria-live="polite" style={{ marginBottom: 16 }}>
          {feedback}
        </p>
      )}

      {formOpen && (
        <form
          className="card-surface"
          onSubmit={saveEvent}
          style={{
            padding: 20,
            marginBottom: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
            Name
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
            Date and time
            <input
              required
              type="datetime-local"
              min={toLocalInputValue(new Date().toISOString())}
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
            Venue
            <input
              required
              value={form.venue}
              onChange={(event) => setForm({ ...form, venue: event.target.value })}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
            Category
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value as EventInput['category'] })
              }
              style={fieldStyle}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
            Capacity
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.capacity}
              onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 13.5, gridColumn: '1 / -1' }}>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              style={fieldStyle}
            />
          </label>
          <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {myEvents.length === 0 ? (
        <EmptyState
          title="No events posted yet"
          description="Once you create an event, it'll show up here."
        />
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myEvents.map((event) => {
            const status = event.cancelled
              ? 'cancelled'
              : event.seatsAvailable <= 0
                ? 'full'
                : 'open'
            return (
              <li
                key={event.id}
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
                    href={`/events/${event.id}`}
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 17,
                      textDecoration: 'none',
                    }}
                  >
                    {event.name}
                  </Link>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: 'var(--ink-soft)',
                      marginTop: 4,
                    }}
                  >
                    {new Date(event.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {event.venue} · {event.seatsAvailable}/{event.capacity}{' '}
                    seats
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={status} />
                  <button
                    className="btn btn-secondary"
                    disabled={event.cancelled}
                    onClick={() => startEdit(event)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={event.cancelled}
                    onClick={() => cancelManagedEvent(event)}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
