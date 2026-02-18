-- Issue 3: Add ups column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS ups INTEGER;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'ups';
