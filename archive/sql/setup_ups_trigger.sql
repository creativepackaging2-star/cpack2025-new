-- This trigger will automatically update product.ups when new orders are created
-- It will use the UPS value from the order

-- First, ensure the products table has a ups column
ALTER TABLE products ADD COLUMN IF NOT EXISTS ups INTEGER;

COMMENT ON COLUMN products.ups IS 'Units per sheet - derived from orders or set manually';

-- Create a function to update product UPS from new orders
CREATE OR REPLACE FUNCTION update_product_ups_from_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the order has a UPS value and product_id
    IF NEW.ups IS NOT NULL AND NEW.product_id IS NOT NULL THEN
        -- Update the product's UPS value
        -- This will overwrite existing values, or you can add logic to only update if NULL
        UPDATE products 
        SET ups = NEW.ups 
        WHERE id = NEW.product_id
        AND (ups IS NULL OR ups != NEW.ups); -- Only update if different or null
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_product_ups ON orders;

-- Create the trigger
CREATE TRIGGER trigger_update_product_ups
    AFTER INSERT OR UPDATE OF ups ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_product_ups_from_order();

COMMENT ON TRIGGER trigger_update_product_ups ON orders IS 'Automatically updates product.ups when orders are created/updated with UPS values';
