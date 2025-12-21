-- CLEAN VERSION: Sync Product Name to Orders
-- This script ONLY adds product_name and uses existing ups/specs columns

BEGIN;

-- Step 1: Add ONLY the missing product_name column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Step 2: Update the automation trigger
CREATE OR REPLACE FUNCTION snapshot_product_to_order()
RETURNS TRIGGER AS $$
DECLARE
    product_record RECORD;
BEGIN
    SELECT * INTO product_record
    FROM products
    WHERE id = NEW.product_id;
    
    IF FOUND THEN
        -- Snapshot Name
        NEW.product_name := product_record.product_name;

        -- Snapshot UPS (Existing column)
        NEW.ups := CASE 
            WHEN product_record.ups ~ '^[0-9]+$' THEN product_record.ups::integer 
            ELSE NULL 
        END;
        
        -- Snapshot Specs (Existing column)
        NEW.specs := product_record.specs;
        
        -- Snapshot other details
        NEW.special_effects := product_record.special_effects;
        NEW.dimension := product_record.dimension;
        NEW.plate_no := product_record.plate_no;
        NEW.ink := product_record.ink;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Re-attach trigger
DROP TRIGGER IF EXISTS trigger_snapshot_product_data ON orders;

CREATE TRIGGER trigger_snapshot_product_data
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.product_id IS NOT NULL)
    EXECUTE FUNCTION snapshot_product_to_order();

-- Step 4: Backfill existing orders
UPDATE orders o
SET 
    product_name = p.product_name,
    ups = CASE WHEN p.ups ~ '^[0-9]+$' THEN p.ups::integer ELSE NULL END,
    specs = p.specs,
    special_effects = p.special_effects,
    dimension = p.dimension,
    plate_no = p.plate_no,
    ink = p.ink
FROM products p
WHERE o.product_id = p.id
AND o.product_id IS NOT NULL;

COMMIT;
