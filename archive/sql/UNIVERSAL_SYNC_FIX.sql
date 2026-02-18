-- 1. CLEANUP OLD TRIGGERS
DROP TRIGGER IF EXISTS trigger_artwork_sync ON products;
DROP TRIGGER IF EXISTS trigger_smart_sync ON products;

-- 2. UNIVERSAL PRODUCT-TO-ORDER SYNC FUNCTION
-- This ensures that whenever ANY design field is updated on a product, 
-- all linked orders are instantly refreshed with the new data.
CREATE OR REPLACE FUNCTION universal_product_sync_to_orders()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET 
        product_name = NEW.product_name,
        artwork_code = NEW.artwork_code,
        artwork_pdf = NEW.artwork_pdf,
        artwork_cdr = NEW.artwork_cdr,
        dimension = NEW.dimension,
        plate_no = NEW.plate_no,
        ink = NEW.ink,
        coating = NEW.coating,
        specs = NEW.specs, -- Sync the generated specs column too
        updated_at = NOW()
    WHERE product_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. APPLY TRIGGER
CREATE TRIGGER trigger_universal_sync
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION universal_product_sync_to_orders();

-- 4. BATCH FIX (Run this once to fix all existing orders right now)
UPDATE products SET updated_at = NOW();

-- 5. STORAGE SEARCH PERMISSIONS (Just in case)
CREATE POLICY "Allow Public Search" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-files');
