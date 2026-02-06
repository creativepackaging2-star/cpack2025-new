-- Add max_del_qty column to orders table
-- This column stores the maximum delivery quantity for calculating gross print quantity

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS max_del_qty NUMERIC DEFAULT 0;

-- Add comment to the column
COMMENT ON COLUMN orders.max_del_qty IS 'Maximum delivery quantity used for gross print calculation';
