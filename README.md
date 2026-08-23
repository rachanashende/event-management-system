# Eventure — Event Management System

A full-stack event management app with a **user module** (browse, book, pay) and an **admin module**
(manage events, categories, approve bookings, manage users).

## Stack
- **Backend:** Node.js, Express, SQLite (Node's built-in `node:sqlite` module — no native compilation needed), JWT auth, bcrypt
- **Frontend:** React (Vite), React Router, plain CSS — pastel blush/lavender "ticket stub" theme

> Requires **Node.js 22.13+** (built-in SQLite support). Run `node -v` to check — if you're on an older version, grab the current LTS from nodejs.org.

## Project structure
```
event-management-system/
├── backend/
│   ├── db/            # schema (database.js) + seed data (seed.js)
│   ├── middleware/     # JWT auth + admin guard
│   ├── routes/         # auth, events, categories, bookings, admin
│   └── server.js
└── frontend/
    └── src/
        ├── pages/user/   # login, register, browse, event detail, my bookings
        ├── pages/admin/  # dashboard, events, categories, bookings, users
        ├── components/   # Navbar, EventCard (ticket-stub), route guards
        └── context/      # AuthContext
```

## Setup (Windows / VS Code)

> ⚠️ If your project folder lives under OneDrive-synced Desktop, `cd Desktop` can fail
> silently in some terminals. If that happens, `cd` straight to the full path instead,
> e.g. `cd "C:\Users\<you>\OneDrive\Desktop\event-management-system"`.

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env      # (Mac/Linux: cp .env.example .env)
```
Open `.env` and set a real `JWT_SECRET` (any long random string).

```bash
npm start
```
No native modules to compile here — the database uses Node's built-in `node:sqlite`,
so `npm install` only pulls pure-JS packages (Express, JWT, bcrypt, etc). You'll see
an `ExperimentalWarning: SQLite is an experimental feature` line in the console —
that's expected and harmless, not an error.
This runs on **http://localhost:5000** and auto-seeds the database on first run with:
- Admin login: `admin@events.com` / `admin123`
- User login: `user@events.com` / `user123`
- 5 categories, 6 sample events

### 2. Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
This runs on **http://localhost:5173** and proxies `/api` calls to the backend on port 5000
(see `vite.config.js`) — so you don't need to configure CORS URLs manually.

### 3. Try it out
- Visit `http://localhost:5173`
- Sign up as a new user, or log in with the demo user account, browse events, book seats,
  pick a payment method (mock — no real gateway, no QR), and check **My Bookings**.
- Log in as admin to see the dashboard, manage events/categories, and approve or reject
  the booking you just made.

## Key design decisions
- **Payments** are simulated, matching the approach used in the train booking app:
  the person picks a method (card / UPI / net banking / wallet), and the booking is
  marked `paid` immediately — no real gateway or QR code integration.
- **Booking flow:** paying reserves the seat right away (seat count decrements inside a
  DB transaction to prevent double-booking), but the booking sits as `pending` until an
  admin approves or rejects it. Rejecting a booking automatically releases the seat and
  mock-refunds the payment.
- **Categories** can't be deleted while events still reference them — the API returns a
  clear error telling you how many events are blocking the deletion.

## Notes for local Windows development
- SQLite database file (`backend/db/eventmanager.db`) is created automatically — don't
  commit it to git if you push this to GitHub (it's already excluded via `.gitignore`).
- Dates are stored/compared as plain `YYYY-MM-DD` strings server-side, avoiding the
  UTC-offset bugs that show up with IST when using JS `Date` objects on the backend.
- The backend uses Node's built-in `node:sqlite` module (`DatabaseSync`) instead of the
  `better-sqlite3` npm package, specifically to avoid the native-module compile step
  that requires Visual Studio build tools on Windows. It's still marked "experimental"
  by Node, but is stable enough for this kind of project. If you outgrow it later
  (e.g. deploying with concurrent writers), Postgres via Prisma is the natural upgrade —
  same pattern as the Daily Tracker app.
