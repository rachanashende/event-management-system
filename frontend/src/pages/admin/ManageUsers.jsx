import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import './AdminPages.css';

function formatDate(dateStr) {
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ManageUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => api.getUsers(token).then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openUser = async (u) => {
    setSelected(u);
    setDetail(null);
    try {
      const d = await api.getUserDetail(token, u.id);
      setDetail(d);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Remove ${u.name}? This deletes their account and booking history.`)) return;
    try {
      await api.deleteUser(token, u.id);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container admin-page">
      <h1>Users</h1>
      <p className="admin-subtitle">Everyone registered to book events.</p>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td>{u.total_bookings}</td>
                <td>{formatDate(u.created_at)}</td>
                <td>
                  <div className="admin-table-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openUser(u)}>View</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6}><div className="empty-state">No users registered yet.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="card modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.name}</h2>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>{selected.email} {selected.phone && `· ${selected.phone}`}</p>

            {!detail ? (
              <p>Loading booking history…</p>
            ) : detail.bookings.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)' }}>No bookings from this user yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {detail.bookings.map((b) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span>{b.event_title}</span>
                    <span className={`badge badge-${b.booking_status}`}>{b.booking_status}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
