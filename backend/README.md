# TripExpCal API

FastAPI backend for the shared trip expense tracker.

## Stack

- FastAPI + SQLAlchemy + Pydantic
- PostgreSQL (Aiven or any managed Postgres)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Start (auto-reloads on `.py` changes):

```bash
python main.py
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs

## Deploy on Vercel (backend)

You need **two Vercel projects** — one for this API, one for the frontend.

### 1. Push this `backend` folder to GitHub

Either:
- a repo that only contains backend files, or
- a monorepo where Vercel Root Directory = `backend`

### 2. Create a Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the repo
3. Set **Root Directory** to `backend` (if monorepo)
4. Framework: **Other**
5. Add Environment Variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | your Aiven Postgres URL (`?sslmode=require`) |
| `CORS_ORIGINS` | `https://YOUR-FRONTEND.vercel.app` |
| `FRONTEND_URL` | `https://YOUR-FRONTEND.vercel.app` |

6. Deploy

### 3. Test

Open:

`https://YOUR-BACKEND.vercel.app/api/health`

Should return `{"status":"ok"}`.

Docs: `https://YOUR-BACKEND.vercel.app/docs`

Copy this backend URL — you’ll set it as `VITE_API_URL` on the frontend project.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/{public_id}` | Trip details |
| POST | `/api/trips/{public_id}/join` | Join / pick name |
| POST | `/api/trips/{public_id}/members` | Add member |
| GET/POST | `/api/trips/{public_id}/expenses` | List / add expenses |
| PUT/DELETE | `/api/trips/{public_id}/expenses/{id}` | Update / delete |
| GET | `/api/trips/{public_id}/balances` | Balances + settlements |
| GET | `/api/health` | Health check |

## Notes

- Keep secrets in Vercel env vars / local `.env` only (never commit them).
- On Vercel the API runs as a Python serverless function (`api/index.py`).
- Locally keep using `python main.py` for auto-reload.
