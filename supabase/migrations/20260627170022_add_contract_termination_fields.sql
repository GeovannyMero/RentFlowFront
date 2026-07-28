/*
# Add contract termination fields

1. Modified Tables
- `contracts`: Added `termination_date` (DATE, nullable) and `termination_reason` (TEXT, nullable) columns to track when and why a contract was terminated by the tenant or landlord.

2. Security
- No new RLS needed — existing policies on contracts cover these columns.
*/

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS termination_reason TEXT;
