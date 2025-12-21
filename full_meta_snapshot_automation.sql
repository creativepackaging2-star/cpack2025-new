-- FINAL STEP: FULL METADATA SNAPSHOT & BACKFILL
-- This script ensures ALL details (Customer, Paper, GSM, etc.) are saved in the Order table.

BEGIN;

-- 1. Updated Trigger Function with ALL fields
CREATE OR REPLACE FUNCTION snapshot_product_to_order()
RETURNS TRIGGER AS $$
DECLARE
    p RECORD;
BEGIN
    SELECT 
        products.*,
        customers.name as customer_name_joined,
        paper_types.name as paper_type_name_joined,
        gsm.name as gsm_name_joined,
        sizes.name as size_name_joined,
        constructions.name as construction_name_joined,
        pasting.name as pasting_name_joined,
        specifications.name as specification_name_joined,
        delivery_addresses.name as delivery_address_joined
    INTO p
    FROM products
    LEFT JOIN customers ON products.customer_id = customers.id
    LEFT JOIN paper_types ON products.paper_type_id = paper_types.id
    LEFT JOIN gsm ON products.gsm_id = gsm.id
    LEFT JOIN sizes ON products.size_id = sizes.id
    LEFT JOIN constructions ON products.construction_id = constructions.id
    LEFT JOIN pasting ON products.pasting_id = pasting.id
    LEFT JOIN specifications ON products.specification_id = specifications.id
    LEFT JOIN delivery_addresses ON products.delivery_address_id = delivery_addresses.id
    WHERE products.id = NEW.product_id;
    
    IF FOUND THEN
        -- Basic Snapshots
        NEW.product_name := COALESCE(NEW.product_name, p.product_name);
        NEW.product_sku := COALESCE(NEW.product_sku, p.sku);
        NEW.artwork_code := COALESCE(NEW.artwork_code, p.artwork_code);
        NEW.ups := CASE WHEN p.ups ~ '^[0-9]+$' THEN p.ups::integer ELSE NEW.ups END;
        NEW.specs := COALESCE(NEW.specs, p.specs);

        -- Lookup Metadata Snapshots
        NEW.customer_name := COALESCE(NEW.customer_name, p.customer_name_joined);
        NEW.paper_type_name := COALESCE(NEW.paper_type_name, p.paper_type_name_joined);
        NEW.gsm_value := COALESCE(NEW.gsm_value, p.gsm_name_joined);
        NEW.print_size := COALESCE(NEW.print_size, p.size_name_joined);
        NEW.pasting_type := COALESCE(NEW.pasting_type, p.pasting_name_joined);
        NEW.construction_type := COALESCE(NEW.construction_type, p.construction_name_joined);
        NEW.specification := COALESCE(NEW.specification, p.specification_name_joined);
        NEW.delivery_address := COALESCE(NEW.delivery_address, p.delivery_address_joined);
        
        -- Technical Details
        NEW.dimension := COALESCE(NEW.dimension, p.dimension);
        NEW.ink := COALESCE(NEW.ink, p.ink);
        NEW.plate_no := COALESCE(NEW.plate_no, p.plate_no);
        NEW.coating := COALESCE(NEW.coating, p.coating);
        NEW.special_effects := COALESCE(NEW.special_effects, p.special_effects);
        
        -- Assets
        NEW.artwork_pdf := COALESCE(NEW.artwork_pdf, p.artwork_pdf);
        NEW.artwork_cdr := COALESCE(NEW.artwork_cdr, p.artwork_cdr);
        NEW.product_image := COALESCE(NEW.product_image, p.product_image);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger
DROP TRIGGER IF EXISTS trigger_snapshot_product_data ON orders;
CREATE TRIGGER trigger_snapshot_product_data
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.product_id IS NOT NULL)
    EXECUTE FUNCTION snapshot_product_to_order();

-- 3. FULL BACKFILL for all existing orders
UPDATE orders o
SET 
    product_name = COALESCE(o.product_name, p.product_name),
    product_sku = COALESCE(o.product_sku, p.sku),
    artwork_code = COALESCE(o.artwork_code, p.artwork_code),
    ups = CASE WHEN p.ups ~ '^[0-9]+$' THEN p.ups::integer ELSE o.ups END,
    specs = COALESCE(o.specs, p.specs),
    customer_name = COALESCE(o.customer_name, cust.name),
    paper_type_name = COALESCE(o.paper_type_name, pt.name),
    gsm_value = COALESCE(o.gsm_value, g.name),
    print_size = COALESCE(o.print_size, s.name),
    pasting_type = COALESCE(o.pasting_type, pas.name),
    construction_type = COALESCE(o.construction_type, con.name),
    specification = COALESCE(o.specification, sp.name),
    delivery_address = COALESCE(o.delivery_address, ad.name),
    dimension = COALESCE(o.dimension, p.dimension),
    ink = COALESCE(o.ink, p.ink),
    plate_no = COALESCE(o.plate_no, p.plate_no),
    coating = COALESCE(o.coating, p.coating),
    special_effects = COALESCE(o.special_effects, p.special_effects),
    artwork_pdf = COALESCE(o.artwork_pdf, p.artwork_pdf),
    artwork_cdr = COALESCE(o.artwork_cdr, p.artwork_cdr),
    product_image = COALESCE(o.product_image, p.product_image)
FROM products p
LEFT JOIN customers cust ON p.customer_id = cust.id
LEFT JOIN paper_types pt ON p.paper_type_id = pt.id
LEFT JOIN gsm g ON p.gsm_id = g.id
LEFT JOIN sizes s ON p.size_id = s.id
LEFT JOIN pasting pas ON p.pasting_id = pas.id
LEFT JOIN constructions con ON p.construction_id = con.id
LEFT JOIN specifications sp ON p.specification_id = sp.id
LEFT JOIN delivery_addresses ad ON p.delivery_address_id = ad.id
WHERE o.product_id = p.id
AND o.product_id IS NOT NULL;

COMMIT;
