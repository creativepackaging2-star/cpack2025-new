
-- Enable RLS and create permissive policies for lookup tables to allow "Add New" functionality

-- Helper macro not available, so repeating for each table:
-- 1. paper_types
ALTER TABLE paper_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all inserts" ON paper_types;
DROP POLICY IF EXISTS "Allow all selects" ON paper_types;
CREATE POLICY "Allow all inserts" ON paper_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects" ON paper_types FOR SELECT USING (true);

-- 2. category
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all inserts" ON category;
DROP POLICY IF EXISTS "Allow all selects" ON category;
CREATE POLICY "Allow all inserts" ON category FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects" ON category FOR SELECT USING (true);

-- 3. customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all inserts" ON customers;
DROP POLICY IF EXISTS "Allow all selects" ON customers;
CREATE POLICY "Allow all inserts" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects" ON customers FOR SELECT USING (true);

-- 4. gsm
ALTER TABLE gsm ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all inserts" ON gsm;
DROP POLICY IF EXISTS "Allow all selects" ON gsm;
CREATE POLICY "Allow all inserts" ON gsm FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects" ON gsm FOR SELECT USING (true);

-- 5. sizes
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all inserts" ON sizes;
DROP POLICY IF EXISTS "Allow all selects" ON sizes;
CREATE POLICY "Allow all inserts" ON sizes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects" ON sizes FOR SELECT USING (true);

-- 6. constructions
ALTER TABLE constructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all inserts" ON constructions;
DROP POLICY IF EXISTS "Allow all selects" ON constructions;
CREATE POLICY "Allow all inserts" ON constructions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects" ON constructions FOR SELECT USING (true);

-- 7. pasting
ALTER TABLE pasting ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all inserts" ON pasting;
DROP POLICY IF EXISTS "Allow all selects" ON pasting;
CREATE POLICY "Allow all inserts" ON pasting FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects" ON pasting FOR SELECT USING (true);
