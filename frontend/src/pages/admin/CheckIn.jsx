import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import './AdminPages.css';
import './CheckIn.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CheckIn() {
  const { token } = useAuth();
  const [code, setCode] = useState('');
  const [attendee, setAttendee] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setCode('');
    setAttendee(null);
    setError('');
    inputRef.current?.focus();
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setAttendee(null);
    try {
      const d = await api.lookupCheckin(token, code.trim());
      setAttendee(d.attendee);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const d = await api.confirmCheckin(token, code.trim());
      setAttendee(d.attendee);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="container admin-page checkin-page">
      <h1>Check-in</h1>
      <p className="admin-subtitle">
        Scan a ticket's QR with any phone camera app, then paste the code below — or plug in a
        USB barcode scanner, which types the code and hits Enter automatically.
      </p>

      <form className="card checkin-form" onSubmit={handleLookup}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Ticket code</label>
          <input
            ref={inputRef}
            autoFocus
            className="mono"
            placeholder="EVQ-42"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading || !code.trim()} style={{ width: '100%' }}>
          {loading ? 'Looking up…' : 'Look up ticket'}
        </button>
      </form>

      {error && <div className="error-text checkin-error">{error}</div>}

      {attendee && (
        <div className="card checkin-result">
          <div className="checkin-result-header">
            <div>
              <h3>{attendee.name}</h3>
              <p className="checkin-result-sub">Seat {attendee.seat_number} · {attendee.booking_ref}</p>
            </div>
            {attendee.checked_in ? (
              <span className="badge badge-approved">Checked in</span>
            ) : (
              <span className={`badge badge-${attendee.booking_status}`}>{attendee.booking_status}</span>
            )}
          </div>

          <div className="checkin-result-details">
            <div><span>Event</span><strong>{attendee.event_title}</strong></div>
            <div><span>Date</span><strong>{formatDate(attendee.event_date)} · {attendee.event_time}</strong></div>
            <div><span>Venue</span><strong>{attendee.venue}</strong></div>
            {attendee.checked_in_at && <div><span>Checked in at</span><strong>{attendee.checked_in_at}</strong></div>}
          </div>

          {attendee.checked_in ? (
            <p className="checkin-note checkin-note-success">✓ This ticket has already been used for entry.</p>
          ) : attendee.booking_status !== 'approved' ? (
            <p className="checkin-note checkin-note-warning">This booking is {attendee.booking_status}, not approved — cannot admit yet.</p>
          ) : (
            <button className="btn btn-primary" onClick={handleConfirm} disabled={confirming} style={{ width: '100%' }}>
              {confirming ? 'Confirming…' : '✓ Confirm entry'}
            </button>
          )}

          <button className="btn btn-ghost btn-sm" onClick={reset} style={{ width: '100%', marginTop: 10 }}>
            Scan next ticket
          </button>
        </div>
      )}
    </div>
  );
}
