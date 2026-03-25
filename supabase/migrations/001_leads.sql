-- ===========================================
-- STABLEPAY: LEADS TABLE
-- Run this in Supabase SQL Editor
-- ===========================================

-- Leads captured from landing page (email summary, waitlist, etc.)
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  payroll_data JSONB,
  source TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique email constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Index for querying by source
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- RLS: Allow anonymous inserts (public landing page), 
-- but only service role / authenticated admin can read
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (landing page is public)
CREATE POLICY "leads_public_insert" ON leads
  FOR INSERT WITH CHECK (true);

-- Allow update for duplicate email handling from API route
CREATE POLICY "leads_public_update" ON leads
  FOR UPDATE USING (true) WITH CHECK (true);

-- Only service role can select (you'll query from Supabase dashboard or admin)
-- No SELECT policy = no public reads (safe by default with RLS)
