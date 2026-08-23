const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('user123', 10);

    db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)`
    ).run('Event Admin', 'admin@events.com', adminHash, 'admin', '9999999999');

    db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)`
    ).run('Demo User', 'user@events.com', userHash, 'user', '8888888888');

    console.log('Seeded users -> admin@events.com / admin123, user@events.com / user123');
  }

  const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  let catIds = {};
  if (catCount === 0) {
    const categories = [
      ['Music', 'Concerts, gigs and live performances', '#E8B4D8'],
      ['Technology', 'Conferences, hackathons and meetups', '#B4C8E8'],
      ['Sports', 'Tournaments and sporting events', '#B4E8C8'],
      ['Arts & Theatre', 'Plays, exhibitions and workshops', '#E8D4B4'],
      ['Food & Drink', 'Festivals, tastings and pop-ups', '#D8B4E8']
    ];
    const insert = db.prepare(
      `INSERT INTO categories (name, description, color) VALUES (?,?,?)`
    );
    categories.forEach(([name, description, color]) => {
      const info = insert.run(name, description, color);
      catIds[name] = info.lastInsertRowid;
    });
    console.log('Seeded categories');
  } else {
    db.prepare('SELECT id, name FROM categories').all().forEach(c => (catIds[c.name] = c.id));
  }

  const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  if (eventCount === 0) {
    const admin = db.prepare(`SELECT id FROM users WHERE role='admin' LIMIT 1`).get();
    const events = [
      ['Indie Sunset Fest', 'An evening of indie bands as the sun goes down.', catIds['Music'], 'Palace Grounds, Bengaluru', '2026-09-12', '17:00', 799, 300],
      ['DevConnect 2026', 'A full-day conference on full-stack and AI engineering.', catIds['Technology'], 'KTPO Convention Centre, Bengaluru', '2026-10-05', '09:30', 1499, 500],
      ['City Marathon', '10K and 21K categories through the city core.', catIds['Sports'], 'MG Road, Bengaluru', '2026-11-01', '06:00', 499, 1000],
      ['Brush & Canvas Expo', 'Contemporary art exhibition from local artists.', catIds['Arts & Theatre'], 'National Gallery, Bengaluru', '2026-09-20', '11:00', 299, 150],
      ['Street Food Carnival', 'Bengaluru\'s biggest street food pop-up.', catIds['Food & Drink'], 'Freedom Park, Bengaluru', '2026-09-27', '12:00', 199, 400],
      ['Acoustic Nights', 'Unplugged sessions from up-and-coming artists.', catIds['Music'], 'The Humming Tree, Bengaluru', '2026-10-15', '19:30', 599, 120]
    ];
    const insert = db.prepare(
      `INSERT INTO events (title, description, category_id, venue, event_date, event_time, price, total_seats, available_seats, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    );
    events.forEach(([title, description, category_id, venue, event_date, event_time, price, seats]) => {
      insert.run(title, description, category_id, venue, event_date, event_time, price, seats, seats, admin ? admin.id : null);
    });
    console.log('Seeded sample events');
  }
}

seed();
module.exports = seed;
