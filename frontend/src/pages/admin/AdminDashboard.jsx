import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import './AdminPages.css';

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats(token).then(setStats).catch((e) => setError(e.message));
    api.getAnalytics(token).then(setAnalytics).catch((e) => setError(e.message));
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
        <Link to="/admin/checkin" className="card admin-quick-link">🎫 Check-in scanner</Link>
        <Link to="/admin/users" className="card admin-quick-link">👥 Manage users</Link>
      </div>

      <h2 className="analytics-heading">Analytics</h2>
      <p className="admin-subtitle" style={{ marginBottom: 20 }}>Based on approved bookings only.</p>

      {analytics && (
        <div className="analytics-grid">
          <div className="card analytics-card">
            <h3>Revenue over time</h3>
            {analytics.revenueByDate.length === 0 ? (
              <p className="analytics-empty">No approved bookings yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.revenueByDate.map((d) => ({ date: formatShortDate(d.date), revenue: d.revenue }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} width={44} />
                  <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', fontSize: '0.82rem' }} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--lavender-deep)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card analytics-card">
            <h3>Bookings by category</h3>
            {analytics.bookingsByCategory.length === 0 ? (
              <p className="analytics-empty">No approved bookings yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics.bookingsByCategory}
                    dataKey="seats"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {analytics.bookingsByCategory.map((c) => (
                      <Cell key={c.category} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} seats`, '']} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', fontSize: '0.82rem' }} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card analytics-card analytics-card-wide">
            <h3>Check-in rate by event</h3>
            {analytics.checkinRates.length === 0 ? (
              <p className="analytics-empty">No approved bookings with attendees yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={analytics.checkinRates.map((e) => ({
                    title: e.title.length > 16 ? e.title.slice(0, 15) + '…' : e.title,
                    'Checked in': e.checked_in,
                    'Not yet': e.total_attendees - e.checked_in
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="title" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', fontSize: '0.82rem' }} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar dataKey="Checked in" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Not yet" stackId="a" fill="var(--lavender-pale)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
