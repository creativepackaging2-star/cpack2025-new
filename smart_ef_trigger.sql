-- FUNCTION: Resolve IDs to Names (Helper)
-- Splits "1|2" and returns "Silver Foil | Gold Foil"
CREATE OR REPLACE FUNCTION resolve_special_effects(effect_ids TEXT)
RETURNS TEXT AS $$
DECLARE
    resolved_names TEXT;
BEGIN
    IF effect_ids IS NULL OR effect_ids = '' THEN
        RETURN '';
    END IF;

    -- Split string, cast to int, match id, aggregate names
    -- Note: We assume effect_ids is like '1|2|5'
    SELECT string_agg(name, ' | ')
    INTO resolved_names
    FROM special_effects
    WHERE id = ANY(string_to_array(effect_ids, '|')::int[]);

    RETURN COALESCE(resolved_names, '');
EXCEPTION WHEN OTHERS THEN
    -- If casting fails (e.g. valid text is passed?), return original
    RETURN effect_ids; 
END;
$$ LANGUAGE plpgsql;


-- TRIGGER FUNCTION: Ensure Specs Has Resolved Names
CREATE OR REPLACE FUNCTION ensure_product_specs_has_ef()
RETURNS TRIGGER AS $$
DECLARE
    ef_names TEXT;
BEGIN
    -- 1. Get Resolved Names (e.g. "Gold Foil | UV") from IDs (e.g. "1|5")
    IF NEW.special_effects IS NOT NULL AND NEW.special_effects <> '' AND NEW.special_effects <> '[]' THEN
        ef_names := resolve_special_effects(NEW.special_effects);
        
        IF ef_names <> '' THEN
            -- 2. Update 'specs'
            IF NEW.specs IS NULL OR NEW.specs = '' THEN
                NEW.specs := ef_names;
            ELSIF position(ef_names in NEW.specs) = 0 THEN
                NEW.specs := NEW.specs || ' | ' || ef_names;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_product_specs_has_ef ON products;

CREATE TRIGGER trigger_ensure_product_specs_has_ef
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_product_specs_has_ef();
