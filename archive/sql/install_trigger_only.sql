-- RUN THIS TO AUTOMATE FUTURE ORDERS
-- This script ensures that whenever a NEW order is created, 
-- it automatically copies UPS and SPECS from the product.

-- 1. Create the automation function
CREATE OR REPLACE FUNCTION snapshot_product_to_order()
RETURNS TRIGGER AS $$
DECLARE
    product_record RECORD;
BEGIN
    -- Get data from the product table
    SELECT * INTO product_record
    FROM products
    WHERE id = NEW.product_id;
    
    IF FOUND THEN
        -- Copy the values to the new order
        NEW.ups := CASE WHEN product_record.ups ~ '^[0-9]+$' THEN product_record.ups::integer ELSE NULL END;
        NEW.specs := product_record.specs;
        NEW.special_effects := product_record.special_effects;
        NEW.dimension := product_record.dimension;
        NEW.plate_no := product_record.plate_no;
        NEW.ink := product_record.ink;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the function to the orders table
DROP TRIGGER IF EXISTS trigger_snapshot_product_data ON orders;

CREATE TRIGGER trigger_snapshot_product_data
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.product_id IS NOT NULL)
    EXECUTE FUNCTION snapshot_product_to_order();

COMMENT ON TRIGGER trigger_snapshot_product_data ON orders IS 'Automatically copies product UPS and Specs to new orders';
