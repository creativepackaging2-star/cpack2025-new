-- 1. FIX: Trigger to Propagate Updates to Orders (Sync)
-- This version handles the UPS type mismatch and maps all fields correctly.
CREATE OR REPLACE FUNCTION propagate_product_updates()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET 
        product_name = NEW.product_name,
        specs = NEW.specs,
        special_effects = NEW.special_effects,
        dimension = NEW.dimension,
        plate_no = NEW.plate_no,
        ink = NEW.ink,
        coating = NEW.coating,
        -- Safe Cast for UPS to prevent 'text vs integer' errors
        ups = CASE WHEN NEW.ups IS NULL OR NEW.ups = '' THEN NULL ELSE CAST(NEW.ups AS INTEGER) END,
        folding_dimension = NEW.folding_dim,
        artwork_code = NEW.artwork_code,
        artwork_pdf = NEW.artwork_pdf,
        artwork_cdr = NEW.artwork_cdr,
        updated_at = NOW()
    WHERE product_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the Sync Trigger
DROP TRIGGER IF EXISTS trigger_propagate_product_updates ON products;
CREATE TRIGGER trigger_propagate_product_updates
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION propagate_product_updates();


-- 2. NEW: Trigger to Ensure Product Specs includes Special Effects
-- This fixes the issue where "Gold Foil" is in special_effects but missing from the specs string.
CREATE OR REPLACE FUNCTION ensure_product_specs_has_ef()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if we have special effects
    IF NEW.special_effects IS NOT NULL AND NEW.special_effects <> '' AND NEW.special_effects <> '[]' THEN
        
        -- If specs is empty, just use special effects
        IF NEW.specs IS NULL OR NEW.specs = '' THEN
            NEW.specs := NEW.special_effects;
            
        -- If specs exists but DOES NOT contain the special effects text, append it
        ELSIF position(NEW.special_effects in NEW.specs) = 0 THEN
            NEW.specs := NEW.specs || ' | ' || NEW.special_effects;
        END IF;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the Spec Fix Trigger (Runs BEFORE the sync trigger)
DROP TRIGGER IF EXISTS trigger_ensure_product_specs_has_ef ON products;
CREATE TRIGGER trigger_ensure_product_specs_has_ef
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_product_specs_has_ef();
