import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import QRTicket from '../../components/QRTicket';
import '../../components/QRTicket.css';
import './MyBookings.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = () => {
    setLoading(true);
    api.getMyBookings(token).then((d) => setBookings(d.bookings)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      await api.cancelBooking(token, id);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="container bookings-page">
      <h1>My bookings</h1>
      <p className="bookings-subtitle">Track the status of every event you've booked.</p>

      {error && <div className="error-text">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading your bookings…</div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <h3>No bookings yet</h3>
          <p>When you book an event, it'll show up here.</p>
          <Link to="/events" className="btn btn-primary" style={{ marginTop: 16 }}>Browse events</Link>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((b) => (
            <div key={b.id} className="ticket booking-row">
              <div className="event-card-top" style={{ '--cat-color': 'var(--lavender)' }}>
                <h3>{b.event_title}</h3>
                <p className="event-card-venue">📍 {b.venue}</p>
                <p className="event-card-date">{formatDate(b.event_date)} · {b.event_time}</p>
              </div>
              <div className="ticket-perforation" />
              <div className="booking-row-stub">
                <div className="booking-row-info">
                  <span className="mono booking-ref">{b.booking_ref}</span>
                  <span>{b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''} · <span className="mono">₹{b.total_amount}</span> via {b.payment_method}</span>
                  {b.attendees?.length > 0 && (
                    <>
                      <span className="booking-row-attendees">{b.attendees.map((a) => a.name).join(', ')}</span>
                      {b.booking_status === 'approved' && (
                        <button
                          type="button"
                          className="booking-row-ticket-toggle"
                          onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                        >
                          {expandedId === b.id ? 'Hide e-tickets ▲' : 'Show e-tickets ▼'}
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="booking-row-actions">
                  <span className={`badge badge-${b.booking_status}`}>{b.booking_status}</span>
                  {(b.booking_status === 'pending' || b.booking_status === 'approved') && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                    >
                      {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>

              {expandedId === b.id && b.booking_status === 'approved' && (
                <div className="booking-row-tickets">
                  {b.attendees.map((a) => (
                    <div key={a.id} className="booking-row-ticket">
                      <QRTicket value={`EVQ-${a.id}`} size={90} />
                      <div>
                        <div className="booking-row-ticket-name">Seat {a.seat_number} — {a.name}</div>
                        {a.checked_in
                          ? <span className="badge badge-approved">Checked in</span>
                          : <span className="booking-row-ticket-hint">Show this QR at entry</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
