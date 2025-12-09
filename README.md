# Care Pharmacy – Full Stack Workspace

A full stack demo for a pharmacy ecosystem:
- **Flutter mobile app** (customer storefront).
- **Node.js + MongoDB backend** (REST API with admin endpoints).
- **Next.js + MUI admin dashboard** (operations UI).

## Contents
- `lib/` – Flutter app with auth, cart, home, orders, profile, seasonal hero, pull-to-refresh, providers, and reusable widgets (e.g., `MedicineCard`, `CartBubbleFab`).
- `backend/` – Express API with auth, users, orders, medicines (soft delete), configs, seasons, uploads (avatars/medicines), seeding, and admin routes.
- `admin_dashboard/` – Next.js App Router dashboard using MUI and Recharts: dashboard analytics, orders management, users, medicines CRUD (with images, composition/precautions chips), configs, sidebar/header layout.
- `Makefile` – common tasks (`make clean`, `make install`, `make up`, `make seed`).

## Feature map
### Flutter app (customer)
- **Auth**: email/password, token handling, guarded API client.
- **Home**: seasonal hero fed by `/api/season`, trending/popular scrollers, pull-to-refresh, search/filter by category/composition, animated cards, seasonal recommendations.
- **Medicines**: detail view with composition/precautions, image rendering, add-to-cart flows.
- **Cart/Checkout**: cart hydration from API, total calculation, server-side price/availability validation (soft-deleted meds blocked).
- **Orders**: list with statuses, detail view.
- **Profile**: address/payment editing, avatar upload consumption.

### Backend (Node + Mongo)
- **Auth**: user/admin JWT, admin-specific token secret support.
- **Users**: profile, address, payment updates, avatar upload (`/uploads/avatars`), totals from orders.
- **Medicines**: CRUD with soft delete (`is_deleted`), composition/precautions arrays, unique constraint (name+manufacturer+category), image upload/delete, absolute image URLs, search/filter/sort/pagination, seasonal tags.
- **Orders**: placement validates availability/soft-delete, lists, detail, mark delivered (admin), status updates.
- **Analytics**: earnings by year, top manufacturers/medicines, dashboard stats.
- **Config**: key/value storage with unique key; seasons API reads Config key `season`.
- **Uploads**: static `/uploads` with CORP disabled + CORS for mobile access.
- **Seeding**: `src/utils/seed.js` seeds admin/demo user, medicines, sample order.

### Admin dashboard (Next.js + MUI)
- **Layout**: sticky header + collapsible sidebar, favicon, consistent spacing.
- **Dashboard**: earnings line/area chart (Recharts) with year filter; insights summary; top manufacturers/medicines charts; recent orders preview with actions.
- **Orders**: search (id/user), status filter, sorting via headers, pagination, detail modal with structured “User & Order Details”, mark delivered action.
- **Users**: search (name/email/address), sort, pagination, avatar rendering, detail modal.
- **Medicines**: search/filter (name/formulation), sort, pagination, add/edit/delete (soft delete), image upload with previews/removal, composition/precautions chips, detail modal shows metadata and pills, duplicate guard.
- **Configs**: list/search, add/edit/delete with confirmation, JSON payload support, unique key validation.

## Quick start
### Backend
```bash
cd backend
cp .env.example .env        # set Mongo URI, JWT secrets, PUBLIC_BASE_URL, etc.
npm install
npm start                   # or npm run dev
```
- Seeder: `npm run seed` via `make seed` (runs `src/utils/seed.js`).
- Uploads: served from `/uploads` with CORP disabled for mobile access.

### Admin dashboard
```bash
cd admin_dashboard
npm install
npm run dev                 # NEXT_PUBLIC_ADMIN_API_BASE_URL should point to backend /api/admin
```

### Flutter app
```bash
flutter pub get
flutter run                 # API base configured in ApiClient
```
- Home supports pull-to-refresh and seasonal hero fed by `/api/season` (reads Config key `season`).
- Soft-deleted medicines are hidden and cart checkout guards against unavailable items.

### Makefile helpers (repo root)
- `make clean` – removes node_modules/build artifacts and runs `flutter clean`.
- `make install` – installs backend/admin_dashboard dependencies.
- `make up` – starts backend then dashboard (dev).
- `make seed` – seeds Mongo with demo data.

## Key behaviors
- Backend soft deletes medicines (`is_deleted`) but keeps records; images are still cleaned up.
- Mobile/admin image URLs normalize to `PUBLIC_BASE_URL` for cross-origin clients.
- Seasons API returns the configured season from Config key `season` (lowercase).
- Admin dashboard uses MUI/Recharts for analytics, tables with sort/search/pagination, detail modals, and image management.

## Demo credentials
- Admin (seeded): `admin@carepharmacy.com` / `Admin@123`
- Demo user (seeded): `demo1@carepharmacy.com` / `password123`

## Coming soon
- OCR based prescription scanning and order filling
- More customizations
- Additional analytics slices (returning customers, cohort retention)
- Push notifications for order status changes
