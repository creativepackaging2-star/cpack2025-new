# Final "Smart" Fix for Special Effects

The previous fix didn't show "Gold Foil" because the database was storing IDs (like "1" or "5") instead of the names.

I have written a **Smart Trigger** that automatically:
1.  Reads the IDs from the product (e.g., "1|5").
2.  Looks up their names in the database (e.g., "Gold Foil", "Spot UV").
3.  Writes the **Names** into the `specs` column.

This ensures your Orders page will always show the readable names, not numbers.

## Run This SQL
Run the code below in your Supabase SQL Editor:

```sql
-- 1. Helper Function: Convert IDs (1|2) to Names (Gold Foil | UV)
CREATE OR REPLACE FUNCTION resolve_special_effects(effect_ids TEXT)
RETURNS TEXT AS $$
DECLARE
    resolved_names TEXT;
BEGIN
    IF effect_ids IS NULL OR effect_ids = '' THEN
        RETURN '';
    END IF;

    -- Split string by '|', convert to matching IDs, join Names
    SELECT string_agg(name, ' | ')
    INTO resolved_names
    FROM special_effects
    WHERE id = ANY(string_to_array(effect_ids, '|')::int[]);

    RETURN COALESCE(resolved_names, '');
EXCEPTION WHEN OTHERS THEN
    -- Fallback: If it fails (e.g. already text), return as is
    RETURN effect_ids; 
END;
$$ LANGUAGE plpgsql;


-- 2. Trigger: Auto-fill Specs with Resolved Names
CREATE OR REPLACE FUNCTION ensure_product_specs_has_ef()
RETURNS TRIGGER AS $$
DECLARE
    ef_names TEXT;
BEGIN
    IF NEW.special_effects IS NOT NULL AND NEW.special_effects <> '' AND NEW.special_effects <> '[]' THEN
        -- Resolve IDs to Names
        ef_names := resolve_special_effects(NEW.special_effects);
        
        IF ef_names <> '' THEN
            -- If specs is empty, set it
            IF NEW.specs IS NULL OR NEW.specs = '' THEN
                NEW.specs := ef_names;
            -- If specs exists but doesn't have the names, append them
            ELSIF position(ef_names in NEW.specs) = 0 THEN
                NEW.specs := NEW.specs || ' | ' || ef_names;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Install Trigger
DROP TRIGGER IF EXISTS trigger_ensure_product_specs_has_ef ON products;

CREATE TRIGGER trigger_ensure_product_specs_has_ef
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_product_specs_has_ef();
```

## Verify
1. Go to App.
2. Open "LivaDrine".
3. Click "Save".
4. Check Orders -> You should now see "Gold Foil" (or whatever was selected) in the specs!
