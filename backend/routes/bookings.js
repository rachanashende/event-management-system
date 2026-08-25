const express = require('express');
const db = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const VALID_PAYMENT_METHODS = ['card', 'upi', 'netbanking', 'wallet'];

function generateBookingRef() {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EVT-${Date.now().toString().slice(-6)}${rand}`;
}

const bookingWithDetails = `
  SELECT b.*, e.title AS event_title, e.venue, e.event_date, e.event_time, e.price AS event_price,
         u.name AS user_name, u.email AS user_email
  FROM bookings b
  JOIN events e ON e.id = b.event_id
  JOIN users u ON u.id = b.user_id
`;

// Attaches an `attendees` array (ordered by seat_number) to a single booking object
function withAttendees(booking) {
  if (!booking) return booking;
  const attendees = db
    .prepare('SELECT id, seat_number, name, phone, checked_in, checked_in_at FROM booking_attendees WHERE booking_id = ? ORDER BY seat_number')
    .all(booking.id);
  return { ...booking, attendees };
}

function withAttendeesList(bookings) {
  return bookings.map(withAttendees);
}

// User: create a booking + mock payment (atomic seat check to prevent double-booking)
router.post('/', verifyToken, (req, res) => {
  const { event_id, seats_booked, payment_method, attendees } = req.body;

  if (!event_id || !seats_booked || seats_booked < 1) {
    return res.status(400).json({ error: 'Event and a valid seat count are required' });
  }
  if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ error: 'Please select a valid payment method' });
  }
  if (!Array.isArray(attendees) || attendees.length !== seats_booked) {
    return res.status(400).json({ error: `Please provide attendee details for all ${seats_booked} seat(s)` });
  }
  for (const [i, a] of attendees.entries()) {
    if (!a || !a.name || !a.name.trim()) {
      return res.status(400).json({ error: `Attendee name is required for seat ${i + 1}` });
    }
  }

  try {
    const result = db.runInTransaction(() => {
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
      if (!event) throw { status: 404, message: 'Event not found' };
      if (event.status !== 'upcoming') throw { status: 400, message: 'This event is no longer accepting bookings' };
      if (event.available_seats < seats_booked) {
        throw { status: 409, message: `Only ${event.available_seats} seat(s) left for this event` };
      }

      // Decrement seats immediately within the transaction to prevent double-booking
      db.prepare('UPDATE events SET available_seats = available_seats - ? WHERE id = ?').run(seats_booked, event_id);

      const total_amount = Math.round(event.price * seats_booked * 100) / 100;
      const booking_ref = generateBookingRef();

      // Mock payment: always succeeds instantly for the selected method
      const info = db
        .prepare(
          `INSERT INTO bookings (user_id, event_id, seats_booked, total_amount, payment_method, payment_status, booking_status, booking_ref)
           VALUES (?,?,?,?,?, 'paid', 'pending', ?)`
        )
        .run(req.user.id, event_id, seats_booked, total_amount, payment_method, booking_ref);

      const insertAttendee = db.prepare(
        'INSERT INTO booking_attendees (booking_id, seat_number, name, phone) VALUES (?,?,?,?)'
      );
      attendees.forEach((a, i) => {
        insertAttendee.run(info.lastInsertRowid, i + 1, a.name.trim(), a.phone ? a.phone.trim() : null);
      });

      return db.prepare(bookingWithDetails + ' WHERE b.id = ?').get(info.lastInsertRowid);
    });

    res.status(201).json({ booking: withAttendees(result), message: 'Payment successful. Booking is pending admin approval.' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Booking failed, please try again' });
  }
});

// User: view own bookings
router.get('/my', verifyToken, (req, res) => {
  const bookings = db.prepare(bookingWithDetails + ' WHERE b.user_id = ? ORDER BY b.created_at DESC').all(req.user.id);
  res.json({ bookings: withAttendeesList(bookings) });
});

// User: cancel own pending/approved booking (releases seats, mock refund)
router.delete('/:id', verifyToken, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only cancel your own bookings' });
  }
  if (booking.booking_status === 'cancelled') {
    return res.status(400).json({ error: 'Booking is already cancelled' });
  }

  db.runInTransaction(() => {
    db.prepare(`UPDATE bookings SET booking_status = 'cancelled', payment_status = 'refunded' WHERE id = ?`).run(req.params.id);
    db.prepare('UPDATE events SET available_seats = available_seats + ? WHERE id = ?').run(booking.seats_booked, booking.event_id);
  });

  res.json({ success: true });
});

// Admin: view all bookings (optional status filter)
router.get('/', verifyToken, requireAdmin, (req, res) => {
  const { status } = req.query;
  let query = bookingWithDetails;
  const params = [];
  if (status) {
    query += ' WHERE b.booking_status = ?';
    params.push(status);
  }
  query += ' ORDER BY b.created_at DESC';
  const bookings = db.prepare(query).all(...params);
  res.json({ bookings: withAttendeesList(bookings) });
});

// Admin: approve or reject a booking
router.patch('/:id/status', verifyToken, requireAdmin, (req, res) => {
  const { booking_status } = req.body;
  if (!['approved', 'rejected'].includes(booking_status)) {
    return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.booking_status !== 'pending') {
    return res.status(400).json({ error: 'Only pending bookings can be approved or rejected' });
  }

  db.runInTransaction(() => {
    db.prepare('UPDATE bookings SET booking_status = ? WHERE id = ?').run(booking_status, req.params.id);
    if (booking_status === 'rejected') {
      // Release seats and mock-refund on rejection
      db.prepare('UPDATE events SET available_seats = available_seats + ? WHERE id = ?').run(booking.seats_booked, booking.event_id);
      db.prepare(`UPDATE bookings SET payment_status = 'refunded' WHERE id = ?`).run(req.params.id);
    }
  });

  const updated = db.prepare(bookingWithDetails + ' WHERE b.id = ?').get(req.params.id);
  res.json({ booking: withAttendees(updated) });
});

module.exports = router;
