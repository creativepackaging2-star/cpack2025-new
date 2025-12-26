-- RESTORE ORIGINAL SPECS FORMAT + ADD UPS
-- This restores the original comprehensive specs format and adds UPS after Size

BEGIN;

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_update_specs ON products;

-- Recreate the original function with UPS added
CREATE OR REPLACE FUNCTION update_product_specs()
RETURNS TRIGGER AS $$
DECLARE
    v_category text;
    v_gsm text;
    v_paper text;
    v_size text;
    v_pasting text;
    v_effects text := '';
    v_specs text := '';
BEGIN
    -- Lookups
    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO v_category FROM category WHERE id = NEW.category_id;
    END IF;

    IF NEW.gsm_id IS NOT NULL THEN
        SELECT name INTO v_gsm FROM gsm WHERE id = NEW.gsm_id;
    END IF;

    IF NEW.paper_type_id IS NOT NULL THEN
        SELECT name INTO v_paper FROM paper_types WHERE id = NEW.paper_type_id;
    END IF;

    IF NEW.size_id IS NOT NULL THEN
        SELECT name INTO v_size FROM sizes WHERE id = NEW.size_id;
    END IF;

    IF NEW.pasting_id IS NOT NULL THEN
        SELECT name INTO v_pasting FROM pasting WHERE id = NEW.pasting_id;
    END IF;

    -- Special Effects (Resolve IDs to Names)
    IF NEW.special_effects IS NOT NULL AND NEW.special_effects != '' THEN
        SELECT string_agg(name, ' | ') INTO v_effects
        FROM special_effects
        WHERE id::text = ANY(string_to_array(NEW.special_effects, '|'));
    END IF;

    -- Construct Specs String (Original Order)
    v_specs := COALESCE(v_gsm, '');
    
    -- Paper
    IF v_specs != '' AND v_paper IS NOT NULL THEN v_specs := v_specs || ' | ' || v_paper;
    ELSIF v_paper IS NOT NULL THEN v_specs := v_paper;
    END IF;

    -- Size
    IF v_specs != '' AND v_size IS NOT NULL THEN v_specs := v_specs || ' | ' || v_size;
    ELSIF v_size IS NOT NULL THEN v_specs := v_size;
    END IF;

    -- *** UPS (NEW - ADDED AFTER SIZE) ***
    IF NEW.ups IS NOT NULL THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.ups::text;
        ELSE v_specs := NEW.ups::text;
        END IF;
    END IF;

    -- Dimension
    IF v_specs != '' AND NEW.dimension IS NOT NULL AND NEW.dimension != '' THEN v_specs := v_specs || ' | ' || NEW.dimension;
    ELSIF NEW.dimension IS NOT NULL AND NEW.dimension != '' THEN v_specs := NEW.dimension;
    END IF;

    -- Coating
    IF NEW.coating IS NOT NULL AND NEW.coating != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.coating;
        ELSE v_specs := NEW.coating;
        END IF;
    END IF;

    -- Special Effects
    IF v_effects IS NOT NULL AND v_effects != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || v_effects;
        ELSE v_specs := v_effects;
        END IF;
    END IF;
    
    -- Ink
    IF NEW.ink IS NOT NULL AND NEW.ink != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.ink;
        ELSE v_specs := NEW.ink;
        END IF;
    END IF;

    -- Plate Number
    IF NEW.plate_no IS NOT NULL AND NEW.plate_no != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.plate_no;
        ELSE v_specs := NEW.plate_no;
        END IF;
    END IF;

    -- Folding (with dimension)
    IF NEW.folding IS NOT NULL AND NEW.folding != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.folding;
        ELSE v_specs := NEW.folding;
        END IF;
        
        IF NEW.folding_dim IS NOT NULL AND NEW.folding_dim != '' THEN
            v_specs := v_specs || ' (' || NEW.folding_dim || ')';
        END IF;
    END IF;
    
    NEW.specs := v_specs;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_specs
    BEFORE INSERT OR UPDATE
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_specs();

-- Refresh all existing products to regenerate specs with UPS
UPDATE products SET updated_at = NOW() WHERE id IS NOT NULL;

COMMIT;
