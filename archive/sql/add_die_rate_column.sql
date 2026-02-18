-- Add die_rate column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS die_rate NUMERIC DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN orders.die_rate IS 'Punch rate / Die cost per unit';
