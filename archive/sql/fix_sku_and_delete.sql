-- 1. Fix Delete Permission (RLS)
-- checks if policy exists (complex in raw sql), so we just drop and recreate to be safe
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."products";
CREATE POLICY "Enable delete for all users" ON "public"."products"
FOR DELETE USING (true);

-- 2. Fix Delete Constraint (Cascade Orders)
-- We need to drop the existing FK and add one with CASCADE
ALTER TABLE "public"."orders"
DROP CONSTRAINT IF EXISTS "orders_product_id_fkey";

ALTER TABLE "public"."orders"
ADD CONSTRAINT "orders_product_id_fkey"
FOREIGN KEY ("product_id")
REFERENCES "public"."products"("id")
ON DELETE CASCADE;

-- 3. Auto-Generate SKU
-- Sequence for SKU numbering
CREATE SEQUENCE IF NOT EXISTS product_sku_seq START 1001;

-- Function to set SKU
CREATE OR REPLACE FUNCTION public.set_sku()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if null or empty
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        NEW.sku := 'PRD-' || nextval('product_sku_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (Drop first to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_set_sku ON "public"."products";
CREATE TRIGGER trigger_set_sku
BEFORE INSERT ON "public"."products"
FOR EACH ROW
EXECUTE FUNCTION public.set_sku();

-- 4. Backfill existing blank SKUs
UPDATE "public"."products"
SET sku = 'PRD-' || nextval('product_sku_seq')
WHERE sku IS NULL OR sku = '';
