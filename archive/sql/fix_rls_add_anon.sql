-- Fix RLS policies to allow ANON role (public access) for INSERT operations
-- This is needed because the app might be using the anon key

-- SPECIFICATIONS TABLE - Add anon INSERT policy
CREATE POLICY "Allow anon users to insert specifications"
ON specifications FOR INSERT
TO anon
WITH CHECK (true);

-- DELIVERY_ADDRESSES TABLE - Add anon INSERT policy
CREATE POLICY "Allow anon users to insert delivery_addresses"
ON delivery_addresses FOR INSERT
TO anon
WITH CHECK (true);

-- Verify all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('specifications', 'delivery_addresses')
ORDER BY tablename, cmd, policyname;
