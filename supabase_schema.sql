-- ============================================================
-- HireLens — Supabase Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── CVs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cvs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  parsed_data JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cvs_user_id ON cvs(user_id);

ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own CVs" ON cvs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Jobs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  company     TEXT,
  source_url  TEXT,
  parsed_data JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own jobs" ON jobs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Analyses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analyses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id                UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  job_id               UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  ats_report           JSONB NOT NULL DEFAULT '{}',
  score_result         JSONB NOT NULL DEFAULT '{}',
  interview_questions  JSONB NOT NULL DEFAULT '[]',
  cover_letter         JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analyses_user_id  ON analyses(user_id);
CREATE INDEX idx_analyses_cv_id    ON analyses(cv_id);
CREATE INDEX idx_analyses_job_id   ON analyses(job_id);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own analyses" ON analyses
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Applications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id  UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'saved'
                 CHECK (status IN ('saved','applied','interview','offer','rejected')),
  notes        TEXT,
  job_title    TEXT,
  company      TEXT,
  score        INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status  ON applications(status);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own applications" ON applications
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
