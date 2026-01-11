# Fix RLS Policies for Specifications and Delivery Addresses

## Problem
You're getting this error when trying to add new specifications or delivery addresses:
```
Failed to add new item: new row violates row-level security policy for table "specifications"
Failed to add new item: new row violates row-level security policy for table "delivery_addresses"
```

## Solution
Run the SQL script in Supabase to fix the RLS policies.

## Steps to Fix:

### 1. Open Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project (cpack2025)

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Copy and Run the SQL Script
Copy the entire contents of `fix_rls_specifications_delivery.sql` and paste it into the SQL editor, then click "Run".

Alternatively, copy this SQL directly:

```sql
-- Fix RLS policies for specifications and delivery_addresses tables

-- SPECIFICATIONS TABLE
DROP POLICY IF EXISTS "Allow authenticated users to read specifications" ON specifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert specifications" ON specifications;
DROP POLICY IF EXISTS "Allow authenticated users to update specifications" ON specifications;
DROP POLICY IF EXISTS "Allow authenticated users to delete specifications" ON specifications;

ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read specifications"
ON specifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert specifications"
ON specifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update specifications"
ON specifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete specifications"
ON specifications FOR DELETE TO authenticated USING (true);

-- DELIVERY_ADDRESSES TABLE
DROP POLICY IF EXISTS "Allow authenticated users to read delivery_addresses" ON delivery_addresses;
DROP POLICY IF EXISTS "Allow authenticated users to insert delivery_addresses" ON delivery_addresses;
DROP POLICY IF EXISTS "Allow authenticated users to update delivery_addresses" ON delivery_addresses;
DROP POLICY IF EXISTS "Allow authenticated users to delete delivery_addresses" ON delivery_addresses;

ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read delivery_addresses"
ON delivery_addresses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert delivery_addresses"
ON delivery_addresses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update delivery_addresses"
ON delivery_addresses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete delivery_addresses"
ON delivery_addresses FOR DELETE TO authenticated USING (true);
```

### 4. Verify
After running the SQL:
- Go back to your product form
- Try adding a new specification or delivery address
- It should work now! ✅

## What This Does
- Enables Row-Level Security (RLS) on both tables
- Creates policies that allow authenticated users to:
  - SELECT (read) records
  - INSERT (create) new records
  - UPDATE (edit) existing records
  - DELETE (remove) records

## Note
This is a one-time fix. Once you run this SQL in Supabase, the problem will be solved permanently for all users.
