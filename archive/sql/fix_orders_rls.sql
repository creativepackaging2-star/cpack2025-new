-- Fix RLS policies for orders table to allow updates

-- 1. Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'orders';

-- 2. Drop existing restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."orders";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."orders";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."orders";
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."orders";

-- 3. Create new permissive policies
CREATE POLICY "Enable read access for all users" ON "public"."orders"
FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON "public"."orders"
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON "public"."orders"
FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON "public"."orders"
FOR DELETE USING (true);
