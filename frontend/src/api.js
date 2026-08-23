const BASE_URL = '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  // auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),

  // categories
  getCategories: () => request('/categories'),
  createCategory: (token, payload) => request('/categories', { method: 'POST', body: payload, token }),
  updateCategory: (token, id, payload) => request(`/categories/${id}`, { method: 'PUT', body: payload, token }),
  deleteCategory: (token, id) => request(`/categories/${id}`, { method: 'DELETE', token }),

  // events
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/events${qs ? `?${qs}` : ''}`);
  },
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (token, payload) => request('/events', { method: 'POST', body: payload, token }),
  updateEvent: (token, id, payload) => request(`/events/${id}`, { method: 'PUT', body: payload, token }),
  deleteEvent: (token, id) => request(`/events/${id}`, { method: 'DELETE', token }),

  // bookings
  createBooking: (token, payload) => request('/bookings', { method: 'POST', body: payload, token }),
  getMyBookings: (token) => request('/bookings/my', { token }),
  cancelBooking: (token, id) => request(`/bookings/${id}`, { method: 'DELETE', token }),
  getAllBookings: (token, status) => request(`/bookings${status ? `?status=${status}` : ''}`, { token }),
  updateBookingStatus: (token, id, booking_status) =>
    request(`/bookings/${id}/status`, { method: 'PATCH', body: { booking_status }, token }),

  // admin
  getStats: (token) => request('/admin/stats', { token }),
  getUsers: (token) => request('/admin/users', { token }),
  getUserDetail: (token, id) => request(`/admin/users/${id}`, { token }),
  deleteUser: (token, id) => request(`/admin/users/${id}`, { method: 'DELETE', token })
};
