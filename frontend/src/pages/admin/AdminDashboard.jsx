import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import './AdminPages.css';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats(token).then(setStats).catch((e) => setError(e.message));
  }, [token]);

  const cards = stats
    ? [
        { label: 'Upcoming events', value: stats.upcomingEvents, sub: `${stats.totalEvents} total`, link: '/admin/events' },
        { label: 'Pending bookings', value: stats.pendingBookings, sub: 'awaiting your review', link: '/admin/bookings', accent: 'warning' },
        { label: 'Approved bookings', value: stats.approvedBookings, sub: 'confirmed attendees', link: '/admin/bookings', accent: 'success' },
        { label: 'Revenue (approved)', value: `₹${stats.revenue}`, sub: `${stats.totalUsers} registered users`, link: '/admin/users' }
      ]
    : [];

  return (
    <div className="container admin-page">
      <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
      <p className="admin-subtitle">Here's what's happening across your events.</p>

      {error && <div className="error-text">{error}</div>}

      <div className="stats-grid">
        {cards.map((c) => (
          <Link to={c.link} key={c.label} className={`card stat-card stat-card-${c.accent || 'default'}`}>
            <span className="stat-label">{c.label}</span>
            <span className="stat-value">{c.value}</span>
            <span className="stat-sub">{c.sub}</span>
          </Link>
        ))}
      </div>

      <div className="admin-quick-links">
        <Link to="/admin/events" className="card admin-quick-link">🎪 Manage events</Link>
        <Link to="/admin/categories" className="card admin-quick-link">🏷 Manage categories</Link>
        <Link to="/admin/bookings" className="card admin-quick-link">✅ Approve bookings</Link>
        <Link to="/admin/users" className="card admin-quick-link">👥 Manage users</Link>
      </div>
    </div>
  );
}
