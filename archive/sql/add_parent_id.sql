
-- Add parent_id column to track split orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES orders(id);

-- Create index for faster grouping
CREATE INDEX IF NOT EXISTS idx_orders_parent_id ON orders(parent_id);

-- Optional: Fix some existing orders if we can identify them (very cautiously)
-- This is hard to do safely without false positives, so we'll skip the backfill
-- and focus on new splits.
