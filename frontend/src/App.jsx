import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireAdmin } from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import EventsList from './pages/user/EventsList';
import EventDetail from './pages/user/EventDetail';
import MyBookings from './pages/user/MyBookings';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageEvents from './pages/admin/ManageEvents';
import ManageCategories from './pages/admin/ManageCategories';
import ApproveBookings from './pages/admin/ApproveBookings';
import ManageUsers from './pages/admin/ManageUsers';
import CheckIn from './pages/admin/CheckIn';

function Layout({ children }) {
  const location = useLocation();
  const hideNav = ['/login', '/register'].includes(location.pathname);
  return (
    <>
      {!hideNav && <Navbar />}
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/events" element={<EventsList />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/my-bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />

            <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/events" element={<RequireAdmin><ManageEvents /></RequireAdmin>} />
            <Route path="/admin/categories" element={<RequireAdmin><ManageCategories /></RequireAdmin>} />
            <Route path="/admin/bookings" element={<RequireAdmin><ApproveBookings /></RequireAdmin>} />
            <Route path="/admin/users" element={<RequireAdmin><ManageUsers /></RequireAdmin>} />
            <Route path="/admin/checkin" element={<RequireAdmin><CheckIn /></RequireAdmin>} />

            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
