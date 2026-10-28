'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/registrations', label: 'My Registrations' },
  { href: '/organizer', label: 'Organizer' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { currentUser, setCurrentUserId, allUsers } = useAuth()
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem('campus-connect-theme')
      const shouldUseDarkMode = savedTheme === 'dark'
      document.documentElement.dataset.theme = shouldUseDarkMode ? 'dark' : 'light'
      setDarkMode(shouldUseDarkMode)
    } catch {
      document.documentElement.dataset.theme = 'light'
    }
  }, [])

  function toggleDarkMode() {
    const nextDarkMode = !darkMode
    document.documentElement.dataset.theme = nextDarkMode ? 'dark' : 'light'
    setDarkMode(nextDarkMode)
    try {
      window.localStorage.setItem('campus-connect-theme', nextDarkMode ? 'dark' : 'light')
    } catch {
      // Keep the current theme for this page even if storage is unavailable.
    }
  }

  return (
    <header
      style={{
        borderBottom: '1.5px solid var(--line)',
        background: 'var(--paper)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        className="shell"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          height: 68,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--amber)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--ink)',
            }}
          >
            Campus Connect
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul style={{ display: 'flex', gap: 4 }}>
            {LINKS.filter(
              (link) =>
                link.href !== '/organizer' || currentUser.role === 'organizer',
            ).map((link) => {
              const active =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    style={{
                      display: 'inline-block',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius)',
                      fontSize: 14.5,
                      fontWeight: 500,
                      textDecoration: 'none',
                      color: active ? 'var(--ink)' : 'var(--ink-soft)',
                      background: active ? 'var(--slate-bg)' : 'transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--ink-soft)',
          }}
        >
          <span className="eyebrow-tag" style={{ whiteSpace: 'nowrap' }}>
            {currentUser.role}
          </span>
          <select
            aria-label="Switch current user"
            value={currentUser.id}
            onChange={(e) => setCurrentUserId(e.target.value)}
            style={{
              border: '1.5px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '6px 8px',
              fontSize: 13.5,
              background: 'var(--paper-raised)',
              color: 'var(--ink)',
            }}
          >
            {allUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: '1.5px solid var(--line)',
              borderRadius: 'var(--radius)',
              background: 'var(--paper-raised)',
              color: 'var(--ink)',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </header>
  )
}
