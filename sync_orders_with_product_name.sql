-- SAFE VERSION: Product data flows to Orders (INCLUDING PRODUCT NAME)
-- This version uses a transaction so you can ROLLBACK if something goes wrong

BEGIN;

-- Step 1: Ensure orders table has all necessary product snapshot columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_ups INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_specs TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Step 2: Create a function to snapshot product data into orders
CREATE OR REPLACE FUNCTION snapshot_product_to_order()
RETURNS TRIGGER AS $$
DECLARE
    product_record RECORD;
BEGIN
    -- Get the full product record
    SELECT * INTO product_record
    FROM products
    WHERE id = NEW.product_id;
    
    IF FOUND THEN
        -- Update the order with product snapshot data
        -- Copy Name
        NEW.product_name := product_record.product_name;

        -- Copy UPS
        NEW.ups := CASE WHEN product_record.ups ~ '^[0-9]+$' THEN product_record.ups::integer ELSE NULL END;
        NEW.product_ups := NEW.ups;
        
        -- Copy specs
        NEW.specs := product_record.specs;
        NEW.product_specs := product_record.specs;
        
        -- Copy other product fields that should be snapshotted
        NEW.special_effects := product_record.special_effects;
        NEW.dimension := product_record.dimension;
        NEW.plate_no := product_record.plate_no;
        NEW.ink := product_record.ink;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_snapshot_product_data ON orders;

CREATE TRIGGER trigger_snapshot_product_data
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.product_id IS NOT NULL)
    EXECUTE FUNCTION snapshot_product_to_order();

COMMENT ON TRIGGER trigger_snapshot_product_data ON orders IS 'Automatically snapshots product data (including Name, UPS, and specs) into orders when created';

-- Step 4: Backfill existing orders (run this once)
-- This updates all existing orders with current product data
UPDATE orders o
SET 
    product_name = p.product_name,
    ups = CASE WHEN p.ups ~ '^[0-9]+$' THEN p.ups::integer ELSE NULL END,
    product_ups = CASE WHEN p.ups ~ '^[0-9]+$' THEN p.ups::integer ELSE NULL END,
    specs = p.specs,
    product_specs = p.specs,
    special_effects = p.special_effects,
    dimension = p.dimension,
    plate_no = p.plate_no,
    ink = p.ink
FROM products p
WHERE o.product_id = p.id
AND o.product_id IS NOT NULL;

COMMIT;
