-- Fix RLS policies for paper_transactions table to allow insertions from the frontend

-- 1. Enable RLS (if not already enabled)
ALTER TABLE "public"."paper_transactions" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."paper_transactions";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."paper_transactions";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."paper_transactions";
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."paper_transactions";

-- 3. Create new permissive policies to allow full access for the "anon" role
CREATE POLICY "Enable all access for all users" ON "public"."paper_transactions"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Also ensure the related tables have similar access if needed (optional but recommended for this app's architecture)
-- Example: 
-- CREATE POLICY "Enable all access for all users" ON "public"."company" FOR ALL USING (true) WITH CHECK (true);
