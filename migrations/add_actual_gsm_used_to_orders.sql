-- Migration: Add actual_gsm_used column to orders table
-- This stores the actual GSM used from the product at the time of order creation

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS actual_gsm_used TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN orders.actual_gsm_used IS 'Actual GSM used for manufacturing (snapshot from product.actual_gsm_used at order creation)';
