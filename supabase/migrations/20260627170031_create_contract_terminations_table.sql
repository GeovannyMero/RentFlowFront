/*
# Create contract terminations history table

1. New Tables
- `contract_terminations`
  - `id` (uuid, primary key)
  - `contract_id` (uuid, references contracts)
  - `termination_date` (date, not null)
  - `reason` (text, not null)
  - `notes` (text)
  - `created_at` (timestamp)
  - `user_id` (uuid, references auth.users)

2. Security
- Enable RLS on contract_terminations.
- Owner-scoped CRUD policies.
*/

CREATE TABLE IF NOT EXISTS contract_terminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  termination_date DATE NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_contract_terminations_contract_id ON contract_terminations(contract_id);
CREATE INDEX idx_contract_terminations_user_id ON contract_terminations(user_id);

ALTER TABLE contract_terminations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_terminations" ON contract_terminations;
CREATE POLICY "select_own_terminations" ON contract_terminations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_terminations" ON contract_terminations;
CREATE POLICY "insert_own_terminations" ON contract_terminations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_terminations" ON contract_terminations;
CREATE POLICY "update_own_terminations" ON contract_terminations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_terminations" ON contract_terminations;
CREATE POLICY "delete_own_terminations" ON contract_terminations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
