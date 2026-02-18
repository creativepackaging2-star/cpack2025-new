-- Trigger to ENSURE products.specs includes Special Effects
CREATE OR REPLACE FUNCTION ensure_product_specs_has_ef()
RETURNS TRIGGER AS $$
DECLARE
    clean_specs TEXT;
BEGIN
    -- 1. If specs is null, just use Special Effects (but usually it has dimensions etc)
    -- 2. If special_effects is empty, do nothing
    IF NEW.special_effects IS NULL OR NEW.special_effects = '' OR NEW.special_effects = '[]' OR NEW.special_effects = '""' THEN
        RETURN NEW;
    END IF;

    -- 3. Check if specs already contains the text.
    --    We normalize simply to avoid duplicate appending.
    IF NEW.specs IS NOT NULL AND position(NEW.special_effects in NEW.specs) > 0 THEN
        RETURN NEW;
    END IF;

    -- 4. Append
    IF NEW.specs IS NULL OR NEW.specs = '' THEN
        NEW.specs := NEW.special_effects;
    ELSE
        NEW.specs := NEW.specs || ' | ' || NEW.special_effects;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_product_specs_has_ef ON products;

-- Run BEFORE update/insert so it modifies the row before saving
CREATE TRIGGER trigger_ensure_product_specs_has_ef
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_product_specs_has_ef();
