import { useEffect, useState } from 'react';
import { api } from '../../api';
import EventCard from '../../components/EventCard';
import './EventsList.css';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCategories().then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const handle = setTimeout(() => {
      api
        .getEvents({ search, category, status: 'upcoming' })
        .then((d) => setEvents(d.events))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, category]);

  return (
    <div className="container events-page">
      <div className="events-hero">
        <h1>Find your next event</h1>
        <p>Browse concerts, conferences, sports and more — book your seat in a few taps.</p>
      </div>

      <div className="events-filters">
        <input
          className="events-search"
          placeholder="Search by event name or venue…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="events-chips">
          <button className={`chip ${category === '' ? 'chip-active' : ''}`} onClick={() => setCategory('')}>All</button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === String(c.id) ? 'chip-active' : ''}`}
              style={{ '--chip-color': c.color }}
              onClick={() => setCategory(category === String(c.id) ? '' : String(c.id))}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <h3>No events found</h3>
          <p>Try a different search term or category.</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
