import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toCSV, downloadCSV, slugify } from '../../utils/csv';
import './AdminPages.css';

const emptyForm = {
  title: '', description: '', category_id: '', venue: '',
  event_date: '', event_time: '', price: '', total_seats: '', status: 'upcoming'
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ManageEvents() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [attendeesFor, setAttendeesFor] = useState(null);
  const [attendeesData, setAttendeesData] = useState(null);
  const [attendeesError, setAttendeesError] = useState('');

  const load = () => api.getEvents().then((d) => setEvents(d.events)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.getCategories().then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (ev) => {
    setEditing(ev);
    setForm({
      title: ev.title, description: ev.description || '', category_id: ev.category_id || '',
      venue: ev.venue, event_date: ev.event_date, event_time: ev.event_time,
      price: ev.price, total_seats: ev.total_seats, status: ev.status
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, price: Number(form.price), total_seats: Number(form.total_seats), category_id: form.category_id || null };
      if (editing) await api.updateEvent(token, editing.id, payload);
      else await api.createEvent(token, payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openAttendees = async (ev) => {
    setAttendeesFor(ev);
    setAttendeesData(null);
    setAttendeesError('');
    try {
      const d = await api.getEventAttendees(token, ev.id);
      setAttendeesData(d.attendees);
    } catch (err) {
      setAttendeesError(err.message);
    }
  };

  const handleExportAttendees = () => {
    if (!attendeesData || attendeesData.length === 0) return;
    const columns = [
      { key: 'seat_number', label: 'Seat' },
      { key: 'name', label: 'Attendee Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'booking_ref', label: 'Booking Ref' },
      { key: 'booking_status', label: 'Status' },
      { key: 'checked_in', label: 'Checked In' },
      { key: 'checked_in_at', label: 'Checked In At' },
      { key: 'booked_by', label: 'Booked By' },
      { key: 'booked_by_email', label: 'Booked By Email' },
      { key: 'booked_at', label: 'Booked At' }
    ];
    const rows = attendeesData.map((a) => ({ ...a, checked_in: a.checked_in ? 'Yes' : 'No' }));
    const csv = toCSV(columns, rows);
    downloadCSV(`attendees_${slugify(attendeesFor.title)}.csv`, csv);
  };

  const handleDelete = async (ev) => {
    if (!confirm(`Delete event "${ev.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteEvent(token, ev.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container admin-page">
      <div className="admin-header-row">
        <div>
          <h1>Manage events</h1>
          <p className="admin-subtitle" style={{ marginBottom: 0 }}>Create, edit and retire events.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New event</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Event</th><th>Category</th><th>Date</th><th>Price</th><th>Seats</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.title}</td>
                <td>{ev.category_name || '—'}</td>
                <td>{formatDate(ev.event_date)}</td>
                <td className="mono">₹{ev.price}</td>
                <td>{ev.available_seats}/{ev.total_seats}</td>
                <td><span className={`badge badge-${ev.status === 'upcoming' ? 'approved' : ev.status === 'cancelled' ? 'rejected' : 'pending'}`}>{ev.status}</span></td>
                <td>
                  <div className="admin-table-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openAttendees(ev)}>Attendees</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ev)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="card modal-panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h2>{editing ? 'Edit event' : 'New event'}</h2>

            <div className="field">
              <label>Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Venue</label>
              <input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Date</label>
                <input type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div className="field">
                <label>Time</label>
                <input type="time" required value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Price (₹)</label>
                <input type="number" min="0" step="1" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="field">
                <label>Total seats</label>
                <input type="number" min="1" step="1" required value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} />
              </div>
            </div>
            {editing && (
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
            </div>
          </form>
        </div>
      )}
      {attendeesFor && (
        <div className="modal-overlay" onClick={() => setAttendeesFor(null)}>
          <div className="card modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="admin-header-row" style={{ marginBottom: 4 }}>
              <h2 style={{ marginBottom: 0 }}>Attendees — {attendeesFor.title}</h2>
              {attendeesData?.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={handleExportAttendees}>⬇ Export CSV</button>
              )}
            </div>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 18 }}>
              {formatDate(attendeesFor.event_date)} · {attendeesFor.venue}
            </p>

            {attendeesError && <div className="error-text">{attendeesError}</div>}

            {!attendeesData ? (
              !attendeesError && <p style={{ color: 'var(--ink-soft)' }}>Loading attendees…</p>
            ) : attendeesData.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)' }}>No attendee details recorded for this event yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
                {attendeesData.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div>
                      <strong>{a.name}</strong>
                      {a.phone && <span style={{ color: 'var(--ink-soft)' }}> · {a.phone}</span>}
                      <div style={{ fontSize: '0.76rem', color: 'var(--ink-faint)' }} className="mono">{a.booking_ref} · Seat {a.seat_number}</div>
                    </div>
                    <span className={`badge badge-${a.checked_in ? 'approved' : a.booking_status}`}>{a.checked_in ? 'Checked in' : a.booking_status}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setAttendeesFor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
