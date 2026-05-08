# HireLens

AI-powered CV analysis tool — match scoring, ATS checks, interview prep, cover letter generation and more.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        HireLens                              │
│                                                              │
│  ┌──────────────┐    HTTP/SSE    ┌──────────────────────┐   │
│  │   Frontend   │◄──────────────►│   Backend (FastAPI)  │   │
│  │ React + Vite │                │   Python 3.11        │   │
│  │ Tailwind CSS │                │   SlowAPI            │   │
│  │ react-i18next│                │   pdfplumber         │   │
│  │ Recharts     │                │   BeautifulSoup4     │   │
│  │ @dnd-kit     │                └──────────┬───────────┘   │
│  └──────────────┘                           │               │
│                                             │               │
│  ┌──────────────────────────────────────────┼─────────────┐ │
│  │           External Services              │             │ │
│  │                                          │             │ │
│  │  ┌─────────────┐  ┌──────────┐  ┌───────▼──────────┐  │ │
│  │  │  Supabase   │  │  Redis   │  │   Groq API       │  │ │
│  │  │ PostgreSQL  │  │  Cache   │  │ llama-3.3-70b    │  │ │
│  │  │ Auth + RLS  │  │ Rate Lmt │  │ llama3-8b-8192   │  │ │
│  │  │  Storage    │  └──────────┘  │ llama-3.1-8b     │  │ │
│  │  └─────────────┘                └──────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | Auth | Email/password + Google OAuth via Supabase |
| 2 | CV Upload | PDF upload → pdfplumber → Groq JSON parsing |
| 3 | Job Ingestion | URL scraping (BeautifulSoup4) or paste → Groq extraction |
| 4 | ATS Scoring | 10-rule check, severity levels, 0-100 score |
| 5 | Match Scoring | Weighted score: skills 35%, experience 25%, education 15%, keywords 25% |
| 6 | AI Explanation | SSE-streamed plain-English score explanation |
| 7 | Interview Prep | 10 role-specific questions with STAR frameworks |
| 8 | Cover Letter | One-click tailored cover letter + subject line |
| 9 | CV Comparison | Side-by-side score diff between two CVs |
| 10 | App Tracker | Drag-and-drop Kanban: saved → applied → interview → offer → rejected → ghosted |
| 11 | History | Searchable analysis history + Recharts score trend line chart |
| 12 | Roast My CV | Public, rate-limited (3/hour/IP) brutal CV feedback |
| 13 | AI Chat | Floating SSE chat panel scoped to current analysis |
| 14 | Dark Mode | Tailwind class strategy, persisted in localStorage |
| 15 | i18n | EN / DE / ES / DA / TR |
| 16 | Landing Page | Hero + feature grid + inline auth form |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key (from console.groq.com) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `RESEND_API_KEY` | Resend API key for email notifications |
| `REDIS_URL` | Redis connection URL (default: `redis://redis:6379`) |
| `ENVIRONMENT` | `development` or `production` |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL (default: `http://localhost:8000`) |

## Quick Start

### 1. Clone and configure

```bash
# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Fill in your keys in both .env files
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/migrations.sql`
3. Enable Google OAuth in Authentication → Providers → Google
4. Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to `.env`

### 3. Get a Groq API key

1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key and add to `backend/.env`

### 4. Run with Docker Compose

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### 5. Run locally (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Backend → Render

```bash
# Connect your GitHub repo to Render
# Use render.yaml Blueprint for automatic setup
```

Or manually:
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

```bash
vercel --cwd frontend
```

Set environment variables in Vercel dashboard.

## AI Model Fallback Chain

The backend automatically falls back through models if one fails:

1. `llama-3.3-70b-versatile` (primary — most capable)
2. `llama3-8b-8192` (fallback)
3. `llama-3.1-8b-instant` (last resort)

## API Reference

Full interactive docs available at `http://localhost:8000/docs` when running.

Key endpoints:
- `POST /cv/upload` — Upload PDF CV
- `POST /jobs/ingest` — Ingest job from URL or text
- `POST /match/score` — Compute match score
- `POST /ats/check` — Run ATS check
- `POST /explain/stream` — Stream score explanation (SSE)
- `POST /interview/generate` — Generate interview questions
- `POST /cover-letter/generate` — Generate cover letter
- `POST /comparison/compare` — Compare two CVs
- `GET  /tracker/applications` — List applications
- `POST /roast/cv` — Public CV roast (rate-limited, no auth)
- `POST /chat/stream` — Stream AI chat (SSE)
