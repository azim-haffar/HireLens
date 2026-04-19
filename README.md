# HireLens — AI-Powered Recruitment Screening Engine

> Upload your CV, paste a job URL, and get an instant ATS score, skill gap analysis, interview prep, and a tailored cover letter — all powered by Google Gemini.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         HireLens                                │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────┐  │
│  │   Frontend   │────▶│   Backend    │────▶│   Supabase     │  │
│  │  React +     │     │  FastAPI     │     │  (DB + Auth +  │  │
│  │  Tailwind    │◀────│  Python      │     │   Storage)     │  │
│  └──────────────┘     └──────┬───────┘     └────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────┐                          │
│                    │  Google Gemini  │                          │
│                    │  (gemini-1.5-   │                          │
│                    │   flash)        │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘

Request flow:
  Browser → Vite Dev / Nginx → FastAPI → Gemini API
                                       → Supabase (service role)
                                       → BeautifulSoup (job scraper)
                                       → pdfplumber (CV parser)
```

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Auth** | Email/password + Google OAuth via Supabase |
| 2 | **CV Parser** | Upload PDF → Gemini extracts skills, experience, education, projects |
| 3 | **Job Ingestion** | Scrape URL (BeautifulSoup) or paste text → structured requirements |
| 4 | **ATS Checker** | 10-rule ATS simulation → flagged issues with severity + fixes |
| 5 | **Scoring Engine** | 0-100 match score with skill/experience/education breakdown |
| 6 | **CV Compare** | Side-by-side v1 vs v2 score diff for the same job |
| 7 | **Interview Prep** | 10 questions (technical/behavioral/situational) with answer frameworks |
| 8 | **App Tracker** | Kanban-style status tracker (saved/applied/interview/offer/rejected) |
| 9 | **Cover Letter** | One-click tailored cover letter with subject line |

## Project Structure

```
HireLens/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── config.py            # Pydantic settings from .env
│   │   ├── database.py          # Supabase client factory
│   │   ├── models/              # Pydantic request/response models
│   │   ├── routes/              # cv, job, analysis, applications, cover_letter
│   │   ├── services/            # gemini, cv_parser, job_scraper, ats_checker,
│   │   │                        # scoring_engine, interview_gen, cover_letter
│   │   └── utils/helpers.py     # JWT auth middleware
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Route layout
│   │   ├── context/AuthContext  # Supabase auth state
│   │   ├── lib/
│   │   │   ├── supabase.js      # Supabase client
│   │   │   └── api.js           # Typed API helpers
│   │   ├── pages/               # Dashboard, Analyze, AnalysisResult,
│   │   │                        # Compare, Applications, History
│   │   └── components/          # CVUpload, JobInput, ScoreCard, ATSReport,
│   │                            # InterviewQuestions, CoverLetter, Navbar
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── supabase_schema.sql          # Run once in Supabase SQL editor
├── docker-compose.yml           # Local dev
├── render.yaml                  # Render deployment
└── README.md
```

## Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key

### 1. Supabase setup

1. Create a new Supabase project
2. Open **SQL Editor** and run `supabase_schema.sql`
3. Enable **Google OAuth** in Authentication → Providers (optional)
4. Note your Project URL, anon key, and service role key

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in .env with your keys
pip install -r requirements.txt
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev
# App available at http://localhost:5173
```

### 4. Docker (full stack)

```bash
# Copy and fill both .env files first
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SECRET_KEY` | JWT signing secret (min 32 chars) |
| `FRONTEND_URL` | CORS allowed origin |
| `ENVIRONMENT` | `development` or `production` |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Same as backend |
| `VITE_SUPABASE_ANON_KEY` | Same as backend |
| `VITE_API_URL` | Backend base URL (empty = same origin via Vite proxy) |

## Deployment on Render

1. Push to GitHub
2. Create a new **Blueprint** in Render and point it at your repo
3. Render reads `render.yaml` and auto-creates both services
4. Set all environment variables in the Render dashboard
5. Both services will deploy and auto-redeploy on every push

> **Important:** Set `VITE_API_URL` to your backend's Render URL (e.g. `https://hirelens-backend.onrender.com`) and `FRONTEND_URL` on the backend to your frontend URL.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cv/upload` | Upload PDF CV (multipart) |
| `GET`  | `/api/cv/` | List user CVs |
| `POST` | `/api/job/` | Create job (URL or text) |
| `GET`  | `/api/job/` | List user jobs |
| `POST` | `/api/analysis/` | Run full analysis |
| `POST` | `/api/analysis/compare` | Compare two CV versions |
| `GET`  | `/api/analysis/` | List analyses |
| `GET`  | `/api/analysis/:id` | Get analysis detail |
| `POST` | `/api/cover-letter/` | Generate cover letter |
| `GET`  | `/api/applications/` | List applications |
| `POST` | `/api/applications/` | Save analysis as application |
| `PATCH`| `/api/applications/:id` | Update application status |

All routes require `Authorization: Bearer <supabase_access_token>`.

## Demo Screenshots

> _Add screenshots here after first run_

- [ ] Dashboard overview
- [ ] CV upload + parsing result
- [ ] Score card with skill breakdown
- [ ] ATS report with expandable issues
- [ ] Interview questions accordion
- [ ] CV comparison side-by-side
- [ ] Cover letter generator
- [ ] Application tracker with status dropdown
