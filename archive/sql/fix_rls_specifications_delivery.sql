-- Fix RLS policies for specifications and delivery_addresses tables
-- This allows authenticated users to INSERT new records

-- ============================================
-- SPECIFICATIONS TABLE
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read specifications" ON specifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert specifications" ON specifications;
DROP POLICY IF EXISTS "Allow authenticated users to update specifications" ON specifications;
DROP POLICY IF EXISTS "Allow authenticated users to delete specifications" ON specifications;

-- Enable RLS
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "allow_all_specifications"
ON specifications FOR ALL TO authenticated, public USING (true) WITH CHECK (true);


-- ============================================
-- DELIVERY_ADDRESSES TABLE
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read delivery_addresses" ON delivery_addresses;
DROP POLICY IF EXISTS "Allow authenticated users to insert delivery_addresses" ON delivery_addresses;
DROP POLICY IF EXISTS "Allow authenticated users to update delivery_addresses" ON delivery_addresses;
DROP POLICY IF EXISTS "Allow authenticated users to delete delivery_addresses" ON delivery_addresses;

-- Enable RLS
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "allow_all_delivery_addresses"
ON delivery_addresses FOR ALL TO authenticated, public USING (true) WITH CHECK (true);



-- ============================================
-- VERIFICATION
-- ============================================

-- Check if policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('specifications', 'delivery_addresses')
ORDER BY tablename, policyname;
