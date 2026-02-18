-- Function to update orders when a product is modified
CREATE OR REPLACE FUNCTION update_orders_from_product()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET 
        product_name = NEW.product_name,
        artwork_code = NEW.artwork_code,
        dimension = NEW.dimension,
        specs = NEW.specs,
        ink = NEW.ink,
        plate_no = NEW.plate_no,
        coating = NEW.coating,
        special_effects = NEW.special_effects,
        artwork_pdf = NEW.artwork_pdf,
        artwork_cdr = NEW.artwork_cdr,
        -- Fetch values from related tables using correct product links
        specification = (SELECT name FROM specifications WHERE id = NEW.specification_id),
        pasting_type = (SELECT name FROM pasting WHERE id = NEW.pasting_id),
        construction_type = (SELECT name FROM constructions WHERE id = NEW.construction_id),
        gsm_value = (SELECT name FROM gsm WHERE id = NEW.gsm_id),
        paper_type_name = (SELECT name FROM paper_types WHERE id = NEW.paper_type_id),
        print_size = (SELECT name FROM sizes WHERE id = NEW.size_id)
    WHERE product_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the function ON UPDATE
DROP TRIGGER IF EXISTS trg_propagate_product_updates ON products;
CREATE TRIGGER trg_propagate_product_updates
AFTER UPDATE ON products
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_orders_from_product();

-- Manual sync functionality
CREATE OR REPLACE FUNCTION sync_all_orders_to_master()
RETURNS void AS $$
BEGIN
    UPDATE orders o
    SET 
        product_name = p.product_name,
        artwork_code = p.artwork_code,
        dimension = p.dimension,
        specs = p.specs,
        ink = p.ink,
        plate_no = p.plate_no,
        coating = p.coating,
        special_effects = p.special_effects,
        artwork_pdf = p.artwork_pdf,
        artwork_cdr = p.artwork_cdr,
        -- Corrected sync logic
        specification = (SELECT name FROM specifications WHERE id = p.specification_id),
        pasting_type = (SELECT name FROM pasting WHERE id = p.pasting_id),
        construction_type = (SELECT name FROM constructions WHERE id = p.construction_id),
        gsm_value = (SELECT name FROM gsm WHERE id = p.gsm_id),
        paper_type_name = (SELECT name FROM paper_types WHERE id = p.paper_type_id),
        print_size = (SELECT name FROM sizes WHERE id = p.size_id)
    FROM products p
    WHERE o.product_id = p.id;
END;
$$ LANGUAGE plpgsql;
