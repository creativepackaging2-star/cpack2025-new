-- Add grouping columns to paper_transactions table

-- 1. Add paper_order_size_id (Links to sizes table)
ALTER TABLE "public"."paper_transactions" 
ADD COLUMN IF NOT EXISTS "paper_order_size_id" INTEGER REFERENCES "public"."sizes"("id");

-- 2. Add printer_id (Links to printers table - acts as Warehouse)
ALTER TABLE "public"."paper_transactions" 
ADD COLUMN IF NOT EXISTS "printer_id" INTEGER REFERENCES "public"."printers"("id");

-- Note: 'sizes' and 'printers' are the correct master table names in this database.
