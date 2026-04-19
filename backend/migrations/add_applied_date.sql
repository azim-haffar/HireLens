-- Add applied_date column to applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS applied_date DATE;
