-- Add product_ups column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_ups INTEGER;

-- Add comment
COMMENT ON COLUMN orders.product_ups IS 'Snapshot of UPS value from product at time of order creation';
