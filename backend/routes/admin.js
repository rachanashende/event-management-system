const express = require('express');
const db = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireAdmin);

// Dashboard summary stats
router.get('/stats', (req, res) => {
  const totalUsers = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'user'`).get().c;
  const totalEvents = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  const upcomingEvents = db.prepare(`SELECT COUNT(*) AS c FROM events WHERE status = 'upcoming'`).get().c;
  const pendingBookings = db.prepare(`SELECT COUNT(*) AS c FROM bookings WHERE booking_status = 'pending'`).get().c;
  const approvedBookings = db.prepare(`SELECT COUNT(*) AS c FROM bookings WHERE booking_status = 'approved'`).get().c;
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(total_amount),0) AS total FROM bookings WHERE booking_status = 'approved'`)
    .get().total;

  res.json({ totalUsers, totalEvents, upcomingEvents, pendingBookings, approvedBookings, revenue });
});

// List all users (with their booking counts)
router.get('/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              COUNT(b.id) AS total_bookings
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id
       WHERE u.role = 'user'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users });
});

// View a single user's detail + booking history
router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const bookings = db
    .prepare(
      `SELECT b.*, e.title AS event_title, e.event_date FROM bookings b
       JOIN events e ON e.id = b.event_id WHERE b.user_id = ? ORDER BY b.created_at DESC`
    )
    .all(req.params.id);

  res.json({ user, bookings });
});

// Remove a user (and their bookings, via cascade)
router.delete('/users/:id', (req, res) => {
  const user = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'user'`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
