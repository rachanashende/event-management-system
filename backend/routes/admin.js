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

// Chart data for the admin analytics dashboard — revenue trend, category mix,
// and per-event check-in rate. Only counts approved bookings, since that's
// the only status that represents confirmed, paying attendance.
router.get('/analytics', (req, res) => {
  const revenueByDate = db
    .prepare(
      `SELECT date(created_at) AS date, SUM(total_amount) AS revenue
       FROM bookings
       WHERE booking_status = 'approved'
       GROUP BY date(created_at)
       ORDER BY date(created_at) ASC`
    )
    .all();

  const bookingsByCategory = db
    .prepare(
      `SELECT COALESCE(c.name, 'Uncategorized') AS category, COALESCE(c.color, '#B9A6DE') AS color,
              SUM(b.seats_booked) AS seats
       FROM bookings b
       JOIN events e ON e.id = b.event_id
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE b.booking_status = 'approved'
       GROUP BY COALESCE(c.id, -1)
       ORDER BY seats DESC`
    )
    .all();

  const checkinRates = db
    .prepare(
      `SELECT e.id, e.title,
              COUNT(ba.id) AS total_attendees,
              SUM(CASE WHEN ba.checked_in = 1 THEN 1 ELSE 0 END) AS checked_in
       FROM events e
       JOIN bookings b ON b.event_id = e.id AND b.booking_status = 'approved'
       JOIN booking_attendees ba ON ba.booking_id = b.id
       GROUP BY e.id
       ORDER BY e.event_date ASC`
    )
    .all();

  res.json({ revenueByDate, bookingsByCategory, checkinRates });
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

// ---------- QR check-in ----------
// Each attendee's ticket QR encodes a short code like "EVQ-42" (their
// booking_attendees.id). This is deliberately simple: scan with any phone
// camera app, then paste/type the decoded text into the check-in screen —
// or plug in a USB barcode scanner, which types the code + Enter automatically.

function parseTicketCode(code) {
  if (!code) return null;
  const match = /^EVQ-(\d+)$/i.exec(String(code).trim());
  return match ? Number(match[1]) : null;
}

const attendeeCheckinDetail = `
  SELECT ba.id, ba.seat_number, ba.name, ba.phone, ba.checked_in, ba.checked_in_at,
         b.booking_ref, b.booking_status, b.event_id,
         e.title AS event_title, e.event_date, e.event_time, e.venue
  FROM booking_attendees ba
  JOIN bookings b ON b.id = ba.booking_id
  JOIN events e ON e.id = b.event_id
`;

// Look up a ticket by its code without checking it in — used to show staff
// who they're about to admit before confirming.
router.get('/checkin/:code', (req, res) => {
  const attendeeId = parseTicketCode(req.params.code);
  if (!attendeeId) return res.status(400).json({ error: 'Unrecognized ticket code' });

  const attendee = db.prepare(attendeeCheckinDetail + ' WHERE ba.id = ?').get(attendeeId);
  if (!attendee) return res.status(404).json({ error: 'No ticket found for this code' });

  res.json({ attendee });
});

// Confirm entry for a ticket
router.post('/checkin/:code', (req, res) => {
  const attendeeId = parseTicketCode(req.params.code);
  if (!attendeeId) return res.status(400).json({ error: 'Unrecognized ticket code' });

  const attendee = db.prepare(attendeeCheckinDetail + ' WHERE ba.id = ?').get(attendeeId);
  if (!attendee) return res.status(404).json({ error: 'No ticket found for this code' });
  if (attendee.booking_status !== 'approved') {
    return res.status(400).json({ error: `Booking is ${attendee.booking_status}, not approved — cannot check in`, attendee });
  }
  if (attendee.checked_in) {
    return res.status(409).json({ error: `Already checked in at ${attendee.checked_in_at}`, attendee });
  }

  db.prepare(`UPDATE booking_attendees SET checked_in = 1, checked_in_at = datetime('now') WHERE id = ?`).run(attendeeId);
  const updated = db.prepare(attendeeCheckinDetail + ' WHERE ba.id = ?').get(attendeeId);
  res.json({ attendee: updated, message: 'Checked in successfully' });
});

module.exports = router;
