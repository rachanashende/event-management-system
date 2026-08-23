import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="navbar-brand-badge">🎟</span>
          Eventure
        </NavLink>

        <nav className="navbar-links">
          {isAdmin ? (
            <>
              <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
              <NavLink to="/admin/events" className={({ isActive }) => (isActive ? 'active' : '')}>Events</NavLink>
              <NavLink to="/admin/categories" className={({ isActive }) => (isActive ? 'active' : '')}>Categories</NavLink>
              <NavLink to="/admin/bookings" className={({ isActive }) => (isActive ? 'active' : '')}>Bookings</NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : '')}>Users</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>Browse Events</NavLink>
              {user && <NavLink to="/my-bookings" className={({ isActive }) => (isActive ? 'active' : '')}>My Bookings</NavLink>}
            </>
          )}
        </nav>

        <div className="navbar-actions">
          {user ? (
            <>
              <span className="navbar-user">Hi, {user.name.split(' ')[0]}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost btn-sm">Log in</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">Sign up</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
