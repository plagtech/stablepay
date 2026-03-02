-- ===========================================
-- STABLEPAY DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ===========================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- COMPANIES ----
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  default_chain TEXT NOT NULL DEFAULT 'base',
  pay_schedule TEXT NOT NULL DEFAULT 'semimonthly' CHECK (pay_schedule IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  wallet_address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- RECIPIENTS (Employees / Contractors) ----
CREATE TABLE recipients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT '',
  pay_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  preferred_chain TEXT NOT NULL DEFAULT 'base',
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'removed')),
  display_mode TEXT NOT NULL DEFAULT 'simple' CHECK (display_mode IN ('simple', 'advanced')),
  invite_token TEXT UNIQUE,
  invite_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- PAY RUNS ----
CREATE TABLE pay_runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  executed_at TIMESTAMPTZ,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  chain TEXT DEFAULT 'multi',
  tx_hash TEXT,
  spraay_batch_id TEXT,
  gas_fee DECIMAL(10,4) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- PAYMENTS (Individual payment within a pay run) ----
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pay_run_id UUID REFERENCES pay_runs(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  amount_gross DECIMAL(12,2) NOT NULL,
  fee DECIMAL(10,4) NOT NULL DEFAULT 0,
  amount_net DECIMAL(12,2) NOT NULL,
  chain TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- FUNDING TRANSACTIONS ----
CREATE TABLE funding_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  chain TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  from_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- COMPANY BALANCE (Materialized view) ----
CREATE TABLE company_balances (
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE PRIMARY KEY,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  last_funded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- INDEXES ----
CREATE INDEX idx_recipients_company ON recipients(company_id);
CREATE INDEX idx_recipients_user ON recipients(user_id);
CREATE INDEX idx_recipients_email ON recipients(email);
CREATE INDEX idx_recipients_invite ON recipients(invite_token);
CREATE INDEX idx_pay_runs_company ON pay_runs(company_id);
CREATE INDEX idx_pay_runs_status ON pay_runs(status);
CREATE INDEX idx_payments_pay_run ON payments(pay_run_id);
CREATE INDEX idx_payments_recipient ON payments(recipient_id);
CREATE INDEX idx_funding_company ON funding_transactions(company_id);

-- ---- ROW LEVEL SECURITY ----
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_balances ENABLE ROW LEVEL SECURITY;

-- Company owners can manage their company
CREATE POLICY "company_owner_all" ON companies
  FOR ALL USING (auth.uid() = owner_id);

-- Company owners can manage their recipients
CREATE POLICY "company_owner_recipients" ON recipients
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Recipients can view their own record
CREATE POLICY "recipient_self_view" ON recipients
  FOR SELECT USING (user_id = auth.uid());

-- Recipients can update their own preferences
CREATE POLICY "recipient_self_update" ON recipients
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Company owners can manage pay runs
CREATE POLICY "company_owner_pay_runs" ON pay_runs
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Company owners can view all payments
CREATE POLICY "company_owner_payments" ON payments
  FOR ALL USING (
    pay_run_id IN (
      SELECT id FROM pay_runs WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

-- Recipients can view their own payments
CREATE POLICY "recipient_own_payments" ON payments
  FOR SELECT USING (
    recipient_id IN (SELECT id FROM recipients WHERE user_id = auth.uid())
  );

-- Company owners can manage funding
CREATE POLICY "company_owner_funding" ON funding_transactions
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Company owners can view balance
CREATE POLICY "company_owner_balance" ON company_balances
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- ---- FUNCTIONS ----

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER recipients_updated_at
  BEFORE UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_token IS NULL THEN
    NEW.invite_token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipients_invite_token
  BEFORE INSERT ON recipients
  FOR EACH ROW EXECUTE FUNCTION generate_invite_token();
