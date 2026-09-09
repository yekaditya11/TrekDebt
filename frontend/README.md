# TrekDebt Frontend

React + TypeScript + Tailwind UI for the shared trip expense tracker.

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`.env`:

```env
VITE_API_URL=http://localhost:8000
```

Open http://localhost:5173

Backend must be running separately (see `../backend/README.md`).

## Scripts

```bash
npm run dev      # local development
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Deploy on Vercel (frontend)

Deploy **backend first**, then this frontend.

### 1. Create a second Vercel project

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import the same (or separate) repo
3. Set **Root Directory** to `frontend`
4. Framework preset: **Vite**
5. Build command: `npm run build`
6. Output directory: `dist`
7. Add Environment Variable:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://YOUR-BACKEND.vercel.app` (no trailing slash) |

8. Deploy

### 2. Wire CORS on the backend

In the **backend** Vercel project → Settings → Environment Variables, set:

```text
CORS_ORIGINS=https://YOUR-FRONTEND.vercel.app
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
```

Redeploy the backend after changing env vars.

### 3. Open the app

Visit `https://YOUR-FRONTEND.vercel.app` — create a trip and share the link.

## Order checklist

1. Deploy backend → confirm `/api/health`
2. Deploy frontend with `VITE_API_URL` = backend URL
3. Update backend `CORS_ORIGINS` to the frontend URL
4. Redeploy backend
