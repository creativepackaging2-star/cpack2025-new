
-- Renaming vat_pc to gst_pc
ALTER TABLE quotations RENAME COLUMN vat_pc TO gst_pc;

-- Adding foreign keys for relational dropdowns
ALTER TABLE quotations ADD COLUMN customer_id INTEGER REFERENCES customers(id);
ALTER TABLE quotations ADD COLUMN product_id INTEGER REFERENCES products(id);

-- Explicitly handling category case if needed (keeping as text but could link to category_id)
-- For now, we'll keep it as text to support existing logic, but add category_id for future.
ALTER TABLE quotations ADD COLUMN category_id INTEGER REFERENCES category(id);

-- Snapshot fields if they don't exist
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS paper_type_id INTEGER;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS paper_type_name VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS gsm_id INTEGER;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS size_id INTEGER;
