-- Trigger to propagate product updates to orders
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
        ups = CASE WHEN NEW.ups IS NULL THEN NULL ELSE NEW.ups::INTEGER END, -- Safe Cast
        folding_dimension = NEW.folding_dim,
        artwork_code = NEW.artwork_code,
        artwork_pdf = NEW.artwork_pdf,
        artwork_cdr = NEW.artwork_cdr,
        updated_at = NOW()
    WHERE product_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_propagate_product_updates ON products;

CREATE TRIGGER trigger_propagate_product_updates
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION propagate_product_updates();
