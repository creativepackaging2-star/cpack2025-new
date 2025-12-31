-- Trigger to propagate product updates to orders
CREATE OR REPLACE FUNCTION propagate_product_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if relevant textual fields changed
    IF (OLD.product_name IS DISTINCT FROM NEW.product_name) OR
       (OLD.specs IS DISTINCT FROM NEW.specs) OR
       (OLD.special_effects IS DISTINCT FROM NEW.special_effects) OR
       (OLD.dimension IS DISTINCT FROM NEW.dimension) OR
       (OLD.ups IS DISTINCT FROM NEW.ups) OR
       (OLD.plate_no IS DISTINCT FROM NEW.plate_no) OR
       (OLD.ink IS DISTINCT FROM NEW.ink) OR
       (OLD.pasting_type IS DISTINCT FROM NEW.pasting_type) OR
       (OLD.construction_type IS DISTINCT FROM NEW.construction_type) OR
       (OLD.specification IS DISTINCT FROM NEW.specification) OR
       (OLD.print_size IS DISTINCT FROM NEW.print_size) OR
       (OLD.folding_dimension IS DISTINCT FROM NEW.folding_dimension) OR
       (OLD.artwork_code IS DISTINCT FROM NEW.artwork_code)
    THEN
        UPDATE orders
        SET 
            product_name = NEW.product_name,
            specs = NEW.specs,
            product_specs = NEW.specs,
            special_effects = NEW.special_effects,
            dimension = NEW.dimension,
            plate_no = NEW.plate_no,
            ink = NEW.ink,
            pasting_type = NEW.pasting_type,
            construction_type = NEW.construction_type,
            specification = NEW.specification,
            print_size = NEW.print_size,
            folding_dimension = NEW.folding_dimension,
            
            -- Sync UPS if numeric (handling text field nature of ups in products vs potentially int in orders)
            ups = CASE WHEN NEW.ups ~ '^[0-9]+$' THEN NEW.ups::integer ELSE NULL END,
            product_ups = CASE WHEN NEW.ups ~ '^[0-9]+$' THEN NEW.ups::integer ELSE NULL END,
            
            artwork_code = NEW.artwork_code,
            artwork_pdf = NEW.artwork_pdf,
            artwork_cdr = NEW.artwork_cdr
        WHERE product_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_propagate_product_updates ON products;

CREATE TRIGGER trigger_propagate_product_updates
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION propagate_product_updates();
