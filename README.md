# HireLens

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)

> **AI-powered recruitment screening engine that simulates ATS systems**

HireLens parses your CV, scrapes any job posting, and delivers an instant ATS compatibility report, weighted match score, skill gap analysis, interview prep, and a tailored cover letter — all in under 30 seconds.

**Live demo:** [https://hire-lens-topaz.vercel.app](https://hire-lens-topaz.vercel.app)

---

## Features

| | Feature | Description |
|---|---|---|
| 🔐 | **Authentication** | Email/password + Google OAuth via Supabase Auth |
| 📄 | **CV Parser** | Upload any PDF — Gemini extracts skills, experience, education, and projects |
| 🔗 | **Job Ingestion** | Scrape a job URL (LinkedIn, Indeed, Greenhouse, Lever) or paste raw text |
| ✅ | **ATS Simulator** | 10-rule ATS compatibility check with severity ratings and fix suggestions |
| 🎯 | **Match Scoring** | 0–100 weighted score across skill fit, experience, education, and keyword coverage |
| 🔄 | **CV Comparison** | Side-by-side diff of two CV versions against the same job — see exactly what improved |
| 🎤 | **Interview Prep** | 10 role-specific questions (technical / behavioural / situational) with answer frameworks |
| 📊 | **Application Tracker** | Track every application through saved → applied → interview → offer → rejected → ghosted |
| ✉️ | **Cover Letter Generator** | One-click tailored cover letter with subject line and highlighted key achievements |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, react-i18next (5 languages), Lucide icons |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, pdfplumber, BeautifulSoup4, SlowAPI |
| **AI** | Google Gemini 1.5 Flash — CV parsing, ATS analysis, scoring, Q&A generation, cover letter |
| **Database / Auth** | Supabase (PostgreSQL + Row-Level Security + Google OAuth) |
| **Schema Migrations** | SQLAlchemy 2.0 models + Alembic migrations |
| **Infrastructure** | Docker Compose (local), Render (backend), Vercel (frontend) |

---

## Architecture

```
User
 │
 ▼
React SPA (Vercel)
 │  Supabase JWT in Authorization header
 ▼
FastAPI (Render)
 ├──▶ pdfplumber        — PDF text extraction
 ├──▶ BeautifulSoup4    — job posting scraper
 ├──▶ Google Gemini API — CV parsing, scoring, ATS, interview gen, cover letter
 └──▶ Supabase          — PostgreSQL storage, Row-Level Security, Auth
```

Every request is authenticated at the FastAPI layer via Supabase JWT verification. The Supabase service-role key is only used server-side — the frontend never touches it.

---

## Project Structure

```
HireLens/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, rate limiting, Sentry
│   │   ├── config.py            # Pydantic settings loaded from .env
│   │   ├── database.py          # Supabase client factory
│   │   ├── limiter.py           # SlowAPI rate limiter
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy engine + SessionLocal
│   │   │   └── models.py        # ORM models mirroring all 6 Supabase tables
│   │   ├── models/              # Pydantic request/response schemas
│   │   ├── routes/              # cv, job, analysis, applications, cover_letter
│   │   ├── services/
│   │   │   ├── gemini.py        # Gemini API wrapper with timeout + JSON extraction
│   │   │   ├── cv_parser.py     # PDF → structured profile via Gemini
│   │   │   ├── job_scraper.py   # URL → structured requirements via scrape + Gemini
│   │   │   ├── ats_checker.py   # 10-rule ATS compatibility engine
│   │   │   ├── scoring_engine.py# Weighted 0-100 match scorer
│   │   │   ├── interview_gen.py # Interview question generator
│   │   │   └── cover_letter.py  # Cover letter generator
│   │   └── utils/helpers.py     # JWT auth dependency
│   ├── alembic/                 # Database migration scripts
│   │   └── versions/0001_initial_schema.py
│   ├── tests/
│   │   └── test_db.py           # SQLAlchemy integration test
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Route layout + keepalive
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Supabase auth state + Google OAuth
│   │   │   └── ThemeContext.jsx # Dark/light mode
│   │   ├── lib/
│   │   │   ├── supabase.js      # Supabase browser client
│   │   │   └── api.js           # Typed API helpers (cvApi, jobApi, analysisApi…)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Stats + recent analyses
│   │   │   ├── Analyze.jsx      # 3-step wizard (upload → job → result)
│   │   │   ├── AnalysisResult.jsx # Score / ATS / Interview / Cover Letter tabs
│   │   │   ├── Compare.jsx      # CV version comparison
│   │   │   ├── Applications.jsx # Application tracker with stats bar
│   │   │   └── History.jsx      # Searchable analysis history
│   │   ├── components/          # Navbar, ScoreCard, ATSReport, InterviewQuestions,
│   │   │                        # CoverLetterTab, CVUpload, JobInput, ErrorBoundary
│   │   ├── i18n/locales/        # en, es, da, de, tr translations
│   │   └── utils/keepalive.js   # Backend ping to prevent Render cold starts
│   ├── public/favicon.svg
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docs/
│   └── SQLAlchemy_vs_Supabase.md
├── supabase_schema.sql          # Run once in Supabase SQL editor
├── docker-compose.yml
├── render.yaml                  # Render Blueprint deployment
└── README.md
```

---

## Local Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or: Node.js 20+ and Python 3.11+ for manual setup
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### 1. Clone and configure

```bash
git clone https://github.com/Lightnin1/HireLens.git
cd HireLens
```

Create `backend/.env`:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-role-key>
GEMINI_API_KEY=<your-gemini-api-key>
SECRET_KEY=<random-32-char-string>
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=http://localhost:8000
```

### 2. Initialise the database

Open the Supabase SQL editor and run `supabase_schema.sql` once.

### 3a. Run with Docker (recommended)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

### 3b. Run manually

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## API Endpoints

All routes require `Authorization: Bearer <supabase_access_token>`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/cv/upload` | Upload PDF CV (multipart/form-data) |
| `GET` | `/api/v1/cv/` | List authenticated user's CVs |
| `POST` | `/api/v1/job/` | Create job from URL or pasted text |
| `GET` | `/api/v1/job/` | List user's saved jobs |
| `DELETE` | `/api/v1/job/:id` | Delete a saved job |
| `POST` | `/api/v1/analysis/` | Run full analysis (CV + job → score + ATS + questions) |
| `POST` | `/api/v1/analysis/compare` | Compare two CV versions against one job |
| `GET` | `/api/v1/analysis/` | List all analyses with job title + company |
| `GET` | `/api/v1/analysis/:id` | Full analysis detail |
| `POST` | `/api/v1/cover-letter/` | Generate tailored cover letter |
| `GET` | `/api/v1/applications/` | List tracked applications |
| `POST` | `/api/v1/applications/` | Save an analysis as a tracked application |
| `PATCH` | `/api/v1/applications/:id` | Update status, notes, or applied date |
| `DELETE` | `/api/v1/applications/:id` | Remove tracked application |
| `GET` | `/health` | Health check (no auth required) |

---

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key (server-side only) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `SECRET_KEY` | ✅ | JWT signing secret (≥ 32 chars in production) |
| `FRONTEND_URL` | ✅ | CORS allowed origin |
| `ENVIRONMENT` | ✅ | `development` or `production` |
| `SENTRY_DSN` | ❌ | Sentry error tracking DSN |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Same as backend |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Same as backend |
| `VITE_API_URL` | ✅ | Backend base URL |

---

## Screenshots

> _Live at [https://hire-lens-topaz.vercel.app](https://hire-lens-topaz.vercel.app)_

| Screen | Description |
|---|---|
| **Dashboard** | Stat cards (analyses run, avg score, interviews) + recent analyses + quick actions |
| **New Analysis** | 3-step wizard: CV upload → job description → AI analysis in progress |
| **Score Card** | Circular match score, skill breakdown bars, matched vs missing skills |
| **ATS Report** | 10 checks with critical / warning / pass badges and expandable fix guides |
| **Interview Prep** | 10 accordion questions colour-coded by type and difficulty |
| **CV Comparison** | Score delta, new skills gained, still-missing skills, summary |
| **Application Tracker** | Stats bar + status badges + inline notes + applied date picker |
| **Cover Letter** | Generated letter with subject line, key highlights, one-click copy |

---

## Deployment

| Service | Platform | Auto-deploy |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | On every push to `main` |
| Backend | [Render](https://render.com) | Via `render.yaml` Blueprint |

See `docs/SQLAlchemy_vs_Supabase.md` for notes on running Alembic migrations against the production database.

---

## Licence

MIT © 2026 Azim Haffar
