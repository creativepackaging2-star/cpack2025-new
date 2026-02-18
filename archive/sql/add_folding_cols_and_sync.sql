-- Add folding columns to orders table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'folding') THEN
        ALTER TABLE orders ADD COLUMN folding text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'folding_dim') THEN
        ALTER TABLE orders ADD COLUMN folding_dim text;
    END IF;
END $$;

-- Update orders with data from products table
UPDATE orders o
SET 
    folding = p.folding,
    folding_dim = p.folding_dim
FROM products p
WHERE o.product_id = p.id AND (o.folding IS NULL OR o.folding_dim IS NULL);
