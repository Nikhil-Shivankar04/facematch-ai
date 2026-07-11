# Nikk Photography

AI-powered event photo delivery platform. Photographers upload event photos in bulk; guests find and download only their own photos using face recognition — no manual sorting, no scrolling through hundreds of strangers' photos.

## Status: Phase 5 — QR Codes + ZIP Download (Complete)

Completed so far:
- **Phase 1:** Admin authentication, Event CRUD, security basics
- **Phase 2:** Bulk photo upload to Cloudinary, thumbnails, cascade delete
- **Phase 3:** AI face detection pipeline (Python/FastAPI), blur scoring, HEIC support
- **Phase 4:** Public guest flow — password gate, selfie matching, individual downloads
- **Phase 5:** QR code generation for guest links (admin dashboard), and one-tap "Download All" ZIP for guests with multiple matched photos

**Known limitation, documented on purpose:** blur detection (`isBlurry`/`blurScore` on each photo) is currently **not** used to filter guest results. During testing, the Laplacian-variance threshold turned out to be miscalibrated for portrait photos specifically — smooth skin and blurred (bokeh) backgrounds naturally score as "low variance" even when perfectly in focus, so the filter was hiding genuinely sharp, correct matches. The blur score is still computed and stored on every photo for future use (e.g., an admin-facing "possibly blurry" badge), but it no longer blocks guests from seeing a match. Properly recalibrating this threshold would need testing against a larger, more varied set of real event photos than we have right now.

## Full Local Dev Setup (all three services)

```bash
# Terminal 1 - AI service
cd ai-service
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2 - Backend
cd backend
npm run dev

# Terminal 3 - Frontend
cd frontend
npm run dev
```

Admin dashboard: `http://localhost:5173` (login with your seeded admin account)
Guest flow: `http://localhost:5173/e/<shareSlug>` (get the real link + QR code from any event's detail page in the admin dashboard)

## Project Status: MVP Complete

All five phases of the original roadmap are done and manually verified end-to-end against real MongoDB Atlas data, a real Cloudinary account, and real face detection/matching. This is a working product, not a partial prototype — an admin can create an event, upload photos, and guests can find and download their own photos via selfie, all the way through.

## Ideas for What's Next (not built, intentionally deferred)

- Favorites (guests marking specific photos)
- Admin analytics (views/downloads per event)
- Multi-event face search ("find me across every event I've attended") — deferred specifically because it's privacy-sensitive and needs a real consent/deletion design, not just a feature flag
- Background job queue (BullMQ/Redis) to replace the current fire-and-forget photo processing, for production-grade reliability
- Recalibrated, better-tested blur detection
- Mobile app

## AI Service Setup (Python/FastAPI)

**Requires Python 3.11 specifically** — the `dlib`/`face_recognition` libraries this service depends on are not reliably compatible with the newest Python releases (3.13+). If you only have a newer Python installed, install 3.11 alongside it (this does not affect or replace your other Python version).

```bash
cd ai-service

# Create a virtual environment using Python 3.11 specifically
py -3.11 -m venv venv

# Activate it (Windows Git Bash)
source venv/Scripts/activate

# Install dependencies
pip install -r requirements.txt
```

**Heads up on `dlib` (a dependency of `face_recognition`):** this is the one step most likely to need extra troubleshooting on Windows, since `dlib` sometimes has to compile from source. If `pip install -r requirements.txt` fails specifically on `dlib`, you likely need **CMake** and **Visual Studio Build Tools (C++ workload)** installed first — search "install cmake windows" and "Visual Studio Build Tools C++ desktop development" if you hit this. This is a known friction point of this library, not a bug in our setup.

Once installed, run the service:
```bash
uvicorn app.main:app --reload --port 8000
```

You should see `Uvicorn running on http://127.0.0.1:8000`. Test it: `curl http://localhost:8000/health`.

**All three services now need to run simultaneously** for the full app to work — three separate terminals:
1. `cd backend && npm run dev` (port 5000)
2. `cd frontend && npm run dev` (port 5173)
3. `cd ai-service && source venv/Scripts/activate && uvicorn app.main:app --reload --port 8000` (port 8000)

Also add this to your `backend/.env` if it's not already there:
```
AI_SERVICE_URL=http://localhost:8000
```

### AI Service Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/detect-faces` | Called by Node after each photo upload — detects faces, returns embeddings + blur score |
| POST | `/match-selfie` | Called during guest matching (Phase 4) — compares a selfie against event face embeddings |

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend runs on a different URL than localhost:5000

npm run dev
```

Runs on `http://localhost:5173`. Make sure the backend (`cd backend && npm run dev`) is running at the same time — the frontend calls it directly, there's no mock data.

### Frontend structure

```
frontend/src/
├── api/client.js         # Axios instance, auto-attaches JWT, handles 401s
├── context/AuthContext.jsx
├── components/           # ProtectedRoute, AdminNav, EventCard, PhotoGrid, PhotoUploader, CreateEventForm
├── pages/                # Login, Dashboard, EventDetail
└── index.css             # Design tokens (brass/teal/ink palette, type scale)
```

## Project Structure

```
nikk-photography/
├── backend/       # Node.js/Express API (auth, events, photos, orchestration)
├── frontend/      # React (Vite) - admin dashboard + guest gallery
└── ai-service/    # Python/FastAPI - face detection & matching (Phase 3+)
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI and a real JWT_SECRET

# create your admin account (edit the constants in this file first)
node src/config/seedAdmin.js

npm run dev
```

Server runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

### API Endpoints (Phase 1)

| Method | Route | Auth required | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | No | Admin login |
| GET | `/api/auth/me` | Yes | Get current admin profile |
| POST | `/api/events` | Yes | Create event |
| GET | `/api/events` | Yes | List my events |
| GET | `/api/events/:id` | Yes | Get one event |
| PATCH | `/api/events/:id` | Yes | Update event |
| DELETE | `/api/events/:id` | Yes | Delete event (and its photos) |
| POST | `/api/events/:eventId/photos` | Yes | Bulk upload photos (multipart field name: `photos`) |
| GET | `/api/events/:eventId/photos` | Yes | List photos for an event |
| DELETE | `/api/events/:eventId/photos/:photoId` | Yes | Delete a single photo |

## Roadmap

- **Phase 1:** Auth + Event Management — done
- **Phase 2:** Photo upload + cloud storage — done
- **Phase 3:** AI face detection/embedding pipeline — done
- **Phase 4:** Guest selfie matching flow — done
- **Phase 5:** QR codes, ZIP download — done
- **Phase 6:** Polish, Docker Compose, deployment — not started

## Tech Stack

React (Vite) · Node.js/Express · Python/FastAPI (AI service) · MongoDB · FAISS (similarity search) · S3/Cloudinary · JWT + bcrypt · BullMQ/Redis · Docker Compose

## Planned Future Features

Favorites, AI best-shot selection, duplicate detection, premium edited galleries, analytics dashboard, multi-event face search, mobile app.
