import { Link } from 'react-router-dom';
import './EventCard.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventCard({ event }) {
  const soldOut = event.available_seats <= 0;
  const lowStock = !soldOut && event.available_seats <= event.total_seats * 0.1;

  return (
    <Link to={`/events/${event.id}`} className="ticket event-card">
      <div className="event-card-top" style={{ '--cat-color': event.category_color || 'var(--lavender)' }}>
        {event.category_name && <span className="event-card-cat">{event.category_name}</span>}
        <h3>{event.title}</h3>
        <p className="event-card-venue">📍 {event.venue}</p>
        <p className="event-card-date">{formatDate(event.event_date)} · {event.event_time}</p>
      </div>

      <div className="ticket-perforation" />

      <div className="event-card-stub">
        <div>
          <span className="event-card-price mono">₹{event.price}</span>
          <span className="event-card-price-label"> / seat</span>
        </div>
        {soldOut ? (
          <span className="badge badge-rejected">Sold out</span>
        ) : lowStock ? (
          <span className="badge badge-pending">{event.available_seats} left</span>
        ) : (
          <span className="event-card-cta">View &amp; book →</span>
        )}
      </div>
    </Link>
  );
}
