import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import QRTicket from '../../components/QRTicket';
import '../../components/QRTicket.css';
import './EventDetail.css';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'upi', label: 'UPI', icon: '📱' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { id: 'wallet', label: 'Wallet', icon: '👛' }
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EventDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [attendees, setAttendees] = useState([{ name: '', phone: '' }]);
  const [method, setMethod] = useState('card');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    api.getEvent(id).then((d) => setEvent(d.event)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  // Keep the attendees array length in sync with the selected seat count,
  // preserving whatever the person already typed for earlier seats.
  const updateSeats = (next) => {
    setSeats(next);
    setAttendees((prev) => {
      const copy = prev.slice(0, next);
      while (copy.length < next) copy.push({ name: '', phone: '' });
      return copy;
    });
  };

  const updateAttendee = (index, field, value) => {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  if (loading) return <div className="container"><div className="empty-state">Loading event…</div></div>;
  if (!event) return <div className="container"><div className="empty-state"><h3>Event not found</h3><p>{error}</p></div></div>;

  const soldOut = event.available_seats <= 0;
  const total = Math.round(event.price * seats * 100) / 100;

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    if (attendees.some((a) => !a.name.trim())) {
      setError('Please enter a name for every seat.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const data = await api.createBooking(token, {
        event_id: event.id,
        seats_booked: seats,
        payment_method: method,
        attendees: attendees.map((a) => ({ name: a.name.trim(), phone: a.phone.trim() }))
      });
      setConfirmed(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="container event-detail-page">
        <div className="ticket confirmation-ticket">
          <div className="event-card-top" style={{ '--cat-color': event.category_color || 'var(--lavender)' }}>
            <span className="event-card-cat">Booking confirmed</span>
            <h3>{event.title}</h3>
            <p className="event-card-venue">📍 {event.venue}</p>
            <p className="event-card-date">{formatDate(event.event_date)} · {event.event_time}</p>
          </div>
          <div className="ticket-perforation" />
          <div className="confirmation-details">
            <div><span>Booking ref</span><strong className="mono">{confirmed.booking_ref}</strong></div>
            <div><span>Seats</span><strong>{confirmed.seats_booked}</strong></div>
            <div><span>Amount paid</span><strong className="mono">₹{confirmed.total_amount}</strong></div>
            <div><span>Status</span><span className="badge badge-pending">Pending admin approval</span></div>
          </div>
          {confirmed.attendees?.length > 0 && (
            <div className="confirmation-attendees">
              <span className="confirmation-attendees-label">Attendees &amp; e-tickets</span>
              {confirmed.attendees.map((a) => (
                <div key={a.id} className="confirmation-attendee-row confirmation-attendee-row-qr">
                  <div>
                    <div>Seat {a.seat_number} — {a.name}</div>
                    <div className="confirmation-attendee-note">Ticket activates once admin approves</div>
                  </div>
                  <QRTicket value={`EVQ-${a.id}`} size={84} />
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="confirmation-note">Payment received. Your seat is held while an admin reviews and approves your booking.</p>
        <div className="confirmation-actions">
          <Link to="/my-bookings" className="btn btn-primary">View my bookings</Link>
          <Link to="/events" className="btn btn-ghost">Browse more events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container event-detail-page">
      <Link to="/events" className="back-link">← Back to events</Link>

      <div className="event-detail-grid">
        <div className="card event-detail-main">
          <span className="event-card-cat" style={{ color: event.category_color }}>{event.category_name}</span>
          <h1>{event.title}</h1>
          <div className="event-detail-meta">
            <span>📍 {event.venue}</span>
            <span>📅 {formatDate(event.event_date)}</span>
            <span>🕒 {event.event_time}</span>
          </div>
          <p className="event-detail-desc">{event.description}</p>
          <div className="event-detail-seats">
            {soldOut ? (
              <span className="badge badge-rejected">Sold out</span>
            ) : (
              <span>{event.available_seats} of {event.total_seats} seats available</span>
            )}
          </div>
        </div>

        <form className="card event-detail-booking" onSubmit={handleBook}>
          <h3>Book your seats</h3>
          {error && <div className="error-text">{error}</div>}

          <div className="field">
            <label>Number of seats</label>
            <div className="seat-stepper">
              <button type="button" onClick={() => updateSeats(Math.max(1, seats - 1))} disabled={soldOut}>−</button>
              <span>{seats}</span>
              <button type="button" onClick={() => updateSeats(Math.min(event.available_seats, seats + 1))} disabled={soldOut}>+</button>
            </div>
          </div>

          <div className="field">
            <label>Attendee details</label>
            <div className="attendee-list">
              {attendees.map((a, i) => (
                <div className="attendee-row" key={i}>
                  <span className="attendee-seat-label">Seat {i + 1}</span>
                  <input
                    placeholder="Full name"
                    value={a.name}
                    onChange={(e) => updateAttendee(i, 'name', e.target.value)}
                    disabled={soldOut}
                    required
                  />
                  <input
                    placeholder="Phone (optional)"
                    value={a.phone}
                    onChange={(e) => updateAttendee(i, 'phone', e.target.value)}
                    disabled={soldOut}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Payment method</label>
            <div className="payment-methods">
              {PAYMENT_METHODS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={`payment-method ${method === m.id ? 'payment-method-active' : ''}`}
                  onClick={() => setMethod(m.id)}
                  disabled={soldOut}
                >
                  <span>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ticket-perforation" style={{ margin: '20px 0' }} />

          <div className="event-detail-total">
            <span>Total amount</span>
            <strong className="mono">₹{total}</strong>
          </div>

          <button className="btn btn-primary" type="submit" disabled={soldOut || submitting} style={{ width: '100%' }}>
            {soldOut ? 'Sold out' : submitting ? 'Processing payment…' : user ? `Pay ₹${total} & Book` : 'Log in to book'}
          </button>
          {!user && <p className="event-detail-login-hint">You'll need an account to book — it only takes a minute.</p>}
        </form>
      </div>
    </div>
  );
}
