-- Add missing 'specs' column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS specs TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('specs', 'specification', 'plate_no', 'construction_type');
