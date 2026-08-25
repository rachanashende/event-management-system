const express = require('express');
const db = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const eventWithCategory = `
  SELECT e.*, c.name AS category_name, c.color AS category_color
  FROM events e
  LEFT JOIN categories c ON c.id = e.category_id
`;

// Public: list events (with optional category / search / status filters)
router.get('/', (req, res) => {
  const { category, search, status } = req.query;
  let query = eventWithCategory + ' WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND e.category_id = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND e.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (e.title LIKE ? OR e.venue LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY e.event_date ASC';

  const events = db.prepare(query).all(...params);
  res.json({ events });
});

// Public: single event detail
router.get('/:id', (req, res) => {
  const event = db.prepare(eventWithCategory + ' WHERE e.id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ event });
});

// Admin: list all attendees for this event (across approved + pending bookings), for check-in
router.get('/:id/attendees', verifyToken, requireAdmin, (req, res) => {
  const event = db.prepare('SELECT id, title FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const attendees = db
    .prepare(
      `SELECT ba.id, ba.seat_number, ba.name, ba.phone,
              b.booking_ref, b.booking_status, b.created_at AS booked_at,
              u.name AS booked_by, u.email AS booked_by_email
       FROM booking_attendees ba
       JOIN bookings b ON b.id = ba.booking_id
       JOIN users u ON u.id = b.user_id
       WHERE b.event_id = ? AND b.booking_status IN ('pending', 'approved')
       ORDER BY b.created_at ASC, ba.seat_number ASC`
    )
    .all(req.params.id);

  res.json({ event, attendees });
});

// Admin: create event
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { title, description, category_id, venue, event_date, event_time, price, total_seats } = req.body;
  if (!title || !venue || !event_date || !event_time || total_seats == null) {
    return res.status(400).json({ error: 'Title, venue, date, time and total seats are required' });
  }

  const info = db
    .prepare(
      `INSERT INTO events (title, description, category_id, venue, event_date, event_time, price, total_seats, available_seats, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(title, description || null, category_id || null, venue, event_date, event_time, price || 0, total_seats, total_seats, req.user.id);

  const event = db.prepare(eventWithCategory + ' WHERE e.id = ?').get(info.lastInsertRowid);
  res.status(201).json({ event });
});

// Admin: update event
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const { title, description, category_id, venue, event_date, event_time, price, total_seats, status } = req.body;

  // Adjust available_seats proportionally if total_seats changes
  let available_seats = existing.available_seats;
  if (total_seats != null && total_seats !== existing.total_seats) {
    const booked = existing.total_seats - existing.available_seats;
    available_seats = Math.max(0, total_seats - booked);
  }

  db.prepare(
    `UPDATE events SET title=?, description=?, category_id=?, venue=?, event_date=?, event_time=?, price=?, total_seats=?, available_seats=?, status=?
     WHERE id = ?`
  ).run(
    title || existing.title,
    description !== undefined ? description : existing.description,
    category_id !== undefined ? category_id : existing.category_id,
    venue || existing.venue,
    event_date || existing.event_date,
    event_time || existing.event_time,
    price != null ? price : existing.price,
    total_seats != null ? total_seats : existing.total_seats,
    available_seats,
    status || existing.status,
    req.params.id
  );

  const updated = db.prepare(eventWithCategory + ' WHERE e.id = ?').get(req.params.id);
  res.json({ event: updated });
});

// Admin: delete event
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
