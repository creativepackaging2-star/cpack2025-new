-- Add category_name column to orders table for snapshot automation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS category_name TEXT;

-- Optional: Update existing orders from their product link
UPDATE orders 
SET category_name = c.name
FROM products p
JOIN category c ON p.category_id = c.id
WHERE orders.product_id = p.id AND orders.category_name IS NULL;
