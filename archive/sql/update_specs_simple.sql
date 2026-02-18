-- Simple approach: Update specs column to include UPS
-- This works whether specs is a regular column or needs to be recreated

-- First, check if specs is a generated column and drop it if so
DO $$
BEGIN
    ALTER TABLE products DROP COLUMN IF EXISTS specs CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Specs column dropped or did not exist';
END $$;

-- Create specs as a regular TEXT column (not generated)
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs TEXT;

-- Update all existing products to include UPS in specs
-- Format: "Size | UPS: X | other details"
UPDATE products
SET specs = 
    COALESCE(
        (SELECT name FROM sizes WHERE id = products.size_id),
        ''
    ) ||
    CASE 
        WHEN ups IS NOT NULL THEN ' | UPS: ' || ups::TEXT 
        ELSE '' 
    END ||
    CASE 
        WHEN dimension IS NOT NULL AND dimension != '' THEN ' | ' || dimension 
        ELSE '' 
    END ||
    CASE 
        WHEN special_effects IS NOT NULL AND special_effects != '' THEN ' | ' || special_effects 
        ELSE '' 
    END;

-- Create a function to auto-update specs when product data changes
CREATE OR REPLACE FUNCTION update_product_specs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.specs := 
        COALESCE(
            (SELECT name FROM sizes WHERE id = NEW.size_id),
            ''
        ) ||
        CASE 
            WHEN NEW.ups IS NOT NULL THEN ' | UPS: ' || NEW.ups::TEXT 
            ELSE '' 
        END ||
        CASE 
            WHEN NEW.dimension IS NOT NULL AND NEW.dimension != '' THEN ' | ' || NEW.dimension 
            ELSE '' 
        END ||
        CASE 
            WHEN NEW.special_effects IS NOT NULL AND NEW.special_effects != '' THEN ' | ' || NEW.special_effects 
            ELSE '' 
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update specs
DROP TRIGGER IF EXISTS trigger_update_specs ON products;

CREATE TRIGGER trigger_update_specs
    BEFORE INSERT OR UPDATE OF size_id, ups, dimension, special_effects
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_specs();

COMMENT ON TRIGGER trigger_update_specs ON products IS 'Automatically updates specs column when product details change';
