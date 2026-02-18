-- Fix the specs trigger to resolve special effect names
CREATE OR REPLACE FUNCTION update_product_specs()
RETURNS TRIGGER AS $$
DECLARE
    effect_names TEXT;
BEGIN
    -- Resolve special effect names from IDs (handles pipe-separated IDs or names)
    IF NEW.special_effects IS NOT NULL AND NEW.special_effects != '' THEN
        SELECT string_agg(
            CASE 
                WHEN elem ~ '^[0-9]+$' THEN (SELECT name FROM special_effects WHERE id = elem::integer)
                ELSE elem
            END, 
            ' | '
        ) INTO effect_names
        FROM unnest(string_to_array(NEW.special_effects, '|')) AS elem;
        
        -- Fallback if string_agg returned nothing (e.g. no matches)
        IF effect_names IS NULL THEN
            effect_names := NEW.special_effects;
        END IF;
    ELSE
        effect_names := NULL;
    END IF;

    NEW.specs := 
        COALESCE(
            (SELECT name FROM sizes WHERE id = NEW.size_id),
            ''
        ) ||
        CASE 
            WHEN NEW.ups IS NOT NULL AND NEW.ups > 0 THEN ' | UPS: ' || NEW.ups::TEXT 
            ELSE '' 
        END ||
        CASE 
            WHEN NEW.dimension IS NOT NULL AND NEW.dimension != '' THEN ' | ' || NEW.dimension 
            ELSE '' 
        END ||
        CASE 
            WHEN effect_names IS NOT NULL THEN ' | ' || effect_names 
            ELSE '' 
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all existing products to fix they 'specs' column
UPDATE products SET updated_at = now();

-- Update the sync script to be more robust or just run it
-- We'll use a script to sync all orders now to ensure they get the NEW specs
