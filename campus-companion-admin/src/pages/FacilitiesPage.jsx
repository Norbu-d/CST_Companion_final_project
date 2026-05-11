import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, MapPin, Info } from 'lucide-react'
import api from '../api/client'

const EMOJI_MAP = {
  basketball: '🏀', library: '📚', lab: '🔬', auditorium: '🎭',
  cafeteria: '🍽️', gym: '💪', conference: '🏛️', classroom: '🏫',
  megaphone: '📢', book: '📖', default: '🏢',
}

function facilityEmoji(icon) {
  return EMOJI_MAP[icon?.toLowerCase()] ?? EMOJI_MAP.default
}

export default function FacilitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api.get('/facilities'),
  })

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-all'],
    queryFn: () => api.get('/bookings/all'),
  })

  const facilities = data?.data ?? []
  const bookings = bookingsData?.data ?? []

  function bookingCount(facilityId) {
    return bookings.filter(b => b.facilityId === facilityId && b.status !== 'REJECTED').length
  }

  function pendingCount(facilityId) {
    return bookings.filter(b => b.facilityId === facilityId && b.status === 'PENDING').length
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Facilities</h1>
          <div className="page-subtitle">Overview of all bookable campus facilities</div>
        </div>
        <span className="badge badge-navy" style={{ fontSize: 13, padding: '6px 14px' }}>
          <Building2 size={13} /> {facilities.length} facilities
        </span>
      </div>

      <div className="page-body">
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : facilities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Building2 size={24} /></div>
            <div className="empty-title">No facilities found</div>
            <div className="empty-body">Import facilities via the backend import script</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {facilities.map(f => {
              const total = bookingCount(f.id)
              const pending = pendingCount(f.id)
              return (
                <div key={f.id} className="card" style={{ overflow: 'hidden' }}>
                  {/* Color bar */}
                  <div style={{ height: 5, background: f.color ?? 'var(--navy)' }} />

                  <div style={{ padding: '20px 20px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{
                        width: 50, height: 50, borderRadius: 12,
                        background: `${f.color ?? '#1A3C6E'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, flexShrink: 0,
                      }}>
                        {facilityEmoji(f.icon)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{f.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                          <MapPin size={11} /> {f.location}
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.5 }}>
                      {f.description}
                    </p>

                    <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <Users size={12} /> Capacity: <strong>{f.capacity}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {total > 0 && (
                          <span className="badge badge-navy">
                            {total} booking{total !== 1 ? 's' : ''}
                          </span>
                        )}
                        {pending > 0 && (
                          <span className="badge badge-pending">
                            {pending} pending
                          </span>
                        )}
                      </div>
                    </div>

                    {f.rules?.length > 0 && (
                      <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Info size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Rules</span>
                        </div>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {f.rules.slice(0, 3).map((rule, i) => (
                            <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>· {rule}</li>
                          ))}
                          {f.rules.length > 3 && (
                            <li style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{f.rules.length - 3} more rules</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
