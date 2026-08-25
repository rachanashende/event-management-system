import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toCSV, downloadCSV, slugify } from '../../utils/csv';
import './AdminPages.css';

const TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' }
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApproveBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('pending');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => api.getAllBookings(token, tab).then((d) => setBookings(d.bookings)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [tab]);

  const handleAction = async (id, status) => {
    setBusyId(id);
    setError('');
    try {
      await api.updateBookingStatus(token, id, status);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = () => {
    if (bookings.length === 0) return;
    const columns = [
      { key: 'booking_ref', label: 'Booking Ref' },
      { key: 'user_name', label: 'Booked By' },
      { key: 'user_email', label: 'Email' },
      { key: 'event_title', label: 'Event' },
      { key: 'event_date', label: 'Event Date' },
      { key: 'seats_booked', label: 'Seats' },
      { key: 'total_amount', label: 'Amount' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'booking_status', label: 'Status' },
      { key: 'created_at', label: 'Booked At' }
    ];
    const csv = toCSV(columns, bookings);
    const label = tab ? tab : 'all';
    downloadCSV(`bookings_${slugify(label)}.csv`, csv);
  };

  return (
    <div className="container admin-page">
      <h1>Bookings</h1>
      <p className="admin-subtitle">Review and approve or reject user booking requests.</p>

      <div className="admin-header-row" style={{ marginBottom: 8 }}>
        <div className="filter-tabs" style={{ marginBottom: 0 }}>
          {TABS.map((t) => (
            <button key={t.id} className={`filter-tab ${tab === t.id ? 'filter-tab-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={bookings.length === 0}>⬇ Export CSV</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Ref</th><th>User</th><th>Event</th><th>Date</th><th>Seats</th><th>Amount</th><th>Payment</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="mono">{b.booking_ref}</td>
                <td>{b.user_name}<br /><span style={{ fontSize: '0.76rem', color: 'var(--ink-faint)' }}>{b.user_email}</span></td>
                <td>{b.event_title}</td>
                <td>{formatDate(b.event_date)}</td>
                <td>{b.seats_booked}</td>
                <td className="mono">₹{b.total_amount}</td>
                <td style={{ textTransform: 'capitalize' }}>{b.payment_method}</td>
                <td><span className={`badge badge-${b.booking_status}`}>{b.booking_status}</span></td>
                <td>
                  {b.booking_status === 'pending' && (
                    <div className="admin-table-actions">
                      <button className="btn btn-primary btn-sm" disabled={busyId === b.id} onClick={() => handleAction(b.id, 'approved')}>Approve</button>
                      <button className="btn btn-danger btn-sm" disabled={busyId === b.id} onClick={() => handleAction(b.id, 'rejected')}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={9}><div className="empty-state">No bookings in this view.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
