-- FIX SPECS (Add Size back to string, Remove Construction)
-- RUN THIS IN SUPABASE SQL EDITOR

BEGIN;

CREATE OR REPLACE FUNCTION update_product_specs()
RETURNS TRIGGER AS $$
DECLARE
    v_category text;
    v_gsm text;
    v_paper text;
    v_size text;
    -- v_construction removed entirely
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
    
    -- Construction block removed

    IF NEW.pasting_id IS NOT NULL THEN
        SELECT name INTO v_pasting FROM pasting WHERE id = NEW.pasting_id;
    END IF;

    -- Special Effects (Resolve IDs to Names)
    IF NEW.special_effects IS NOT NULL AND NEW.special_effects != '' THEN
        SELECT string_agg(name, ' | ') INTO v_effects
        FROM special_effects
        WHERE id::text = ANY(string_to_array(NEW.special_effects, '|'));
    END IF;

    -- Construct Specs String
    v_specs := COALESCE(v_gsm, '');
    
    IF v_specs != '' AND v_paper IS NOT NULL THEN v_specs := v_specs || ' | ' || v_paper;
    ELSIF v_paper IS NOT NULL THEN v_specs := v_paper;
    END IF;

    -- ADDED SIZE HERE
    IF v_specs != '' AND v_size IS NOT NULL THEN v_specs := v_specs || ' | ' || v_size;
    ELSIF v_size IS NOT NULL THEN v_specs := v_size;
    END IF;

    IF v_specs != '' AND NEW.dimension IS NOT NULL AND NEW.dimension != '' THEN v_specs := v_specs || ' | ' || NEW.dimension;
    ELSIF NEW.dimension IS NOT NULL AND NEW.dimension != '' THEN v_specs := NEW.dimension;
    END IF;

    IF NEW.coating IS NOT NULL AND NEW.coating != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.coating;
        ELSE v_specs := NEW.coating;
        END IF;
    END IF;

    -- Add Effects Name
    IF v_effects IS NOT NULL AND v_effects != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || v_effects;
        ELSE v_specs := v_effects;
        END IF;
    END IF;
    
    -- New Fields
    IF NEW.ink IS NOT NULL AND NEW.ink != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.ink;
        ELSE v_specs := NEW.ink;
        END IF;
    END IF;

    IF NEW.plate_no IS NOT NULL AND NEW.plate_no != '' THEN
        IF v_specs != '' THEN v_specs := v_specs || ' | ' || NEW.plate_no;
        ELSE v_specs := NEW.plate_no;
        END IF;
    END IF;

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

-- Trigger update to refresh specs
UPDATE products SET updated_at = NOW() WHERE id IS NOT NULL;

COMMIT;
