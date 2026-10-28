'use client'

import { useEffect, useState } from 'react'
import {
  events,
  EventCategory,
  EventSortMode,
  filterEventsByCategory,
  isPastEvent,
  searchEventsByName,
} from '@/data/events'
import EventCard from '@/components/EventCard'
import EmptyState from '@/components/EmptyState'

const CATEGORIES: (EventCategory | 'All')[] = [
  'All',
  'Tech',
  'Cultural',
  'Sports',
  'Workshop',
  'Career',
  'Music',
]

export default function EventsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<EventCategory | 'All'>('All')
  const [sortBy, setSortBy] = useState<EventSortMode>('date')
  const [eventList, setEventList] = useState(events)

  useEffect(() => {
    let active = true
    fetch(`/api/events?sort=${sortBy}`)
      .then((response) => response.json())
      .then((data) => {
        if (active && Array.isArray(data.events)) setEventList(data.events)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [sortBy])

  const filteredEvents = searchEventsByName(
    filterEventsByCategory(
      eventList.filter((event) => !event.cancelled && !isPastEvent(event)),
      category,
    ),
    query,
  )

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">the board</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>All events</h1>
        <p style={{ marginTop: 8 }}>
          Everything posted by clubs and departments this semester.
        </p>
      </div>

      <div
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}
      >
        <input
          type="search"
          placeholder="Search events by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: '1 1 240px',
            padding: '10px 14px',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)',
            fontSize: 14.5,
            background: 'var(--paper-raised)',
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EventCategory | 'All')}
          style={{
            padding: '10px 14px',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)',
            fontSize: 14.5,
            background: 'var(--paper-raised)',
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All categories' : c}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort events"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as EventSortMode)}
          style={{
            padding: '10px 14px',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)',
            fontSize: 14.5,
            background: 'var(--paper-raised)',
          }}
        >
          <option value="date">Soonest first</option>
          <option value="newest">Farthest away first</option>
          <option value="registrations">Popular by registrations</option>
          <option value="registration-rate">Popular by capacity %</option>
        </select>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Try a different search term or category."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}
