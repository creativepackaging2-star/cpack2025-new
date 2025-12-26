-- Add dropdown columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS printer_id INTEGER REFERENCES printers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paperwala_id INTEGER REFERENCES paperwala(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paper_order_size_id INTEGER REFERENCES sizes(id);

-- Add comments for clarity
COMMENT ON COLUMN orders.printer_id IS 'Reference to the printers table';
COMMENT ON COLUMN orders.paperwala_id IS 'Reference to the paperwala table';
COMMENT ON COLUMN orders.paper_order_size_id IS 'Reference to the sizes table for paper order size';

-- Backfill data (optional, but good if we can match by name)
-- UPDATE orders o SET printer_id = p.id FROM printers p WHERE o.printer_name = p.name AND o.printer_id IS NULL;
-- UPDATE orders o SET paperwala_id = p.id FROM paperwala p WHERE o.paperwala_name = p.name AND o.paperwala_id IS NULL;
