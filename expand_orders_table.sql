-- Add snapshot columns to orders table to store product specs at time of order
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS paper_type_name TEXT,
ADD COLUMN IF NOT EXISTS gsm_value TEXT,
ADD COLUMN IF NOT EXISTS print_size TEXT,
ADD COLUMN IF NOT EXISTS dimension TEXT,
ADD COLUMN IF NOT EXISTS ink TEXT,
ADD COLUMN IF NOT EXISTS plate_no TEXT,
ADD COLUMN IF NOT EXISTS coating TEXT,
ADD COLUMN IF NOT EXISTS special_effects TEXT,
ADD COLUMN IF NOT EXISTS pasting_type TEXT,
ADD COLUMN IF NOT EXISTS construction_type TEXT,
ADD COLUMN IF NOT EXISTS specification TEXT,
ADD COLUMN IF NOT EXISTS artwork_code TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS artwork_pdf TEXT,
ADD COLUMN IF NOT EXISTS artwork_cdr TEXT;

-- Comment on columns for clarity
COMMENT ON COLUMN orders.customer_name IS 'Snapshot of customer name at time of order';
COMMENT ON COLUMN orders.paper_type_name IS 'Snapshot of paper type name at time of order';
COMMENT ON COLUMN orders.gsm_value IS 'Snapshot of GSM value at time of order';
COMMENT ON COLUMN orders.print_size IS 'Snapshot of print size at time of order';
COMMENT ON COLUMN orders.dimension IS 'Snapshot of product dimension at time of order';
COMMENT ON COLUMN orders.ink IS 'Snapshot of ink details at time of order';
COMMENT ON COLUMN orders.plate_no IS 'Snapshot of plate number at time of order';
COMMENT ON COLUMN orders.coating IS 'Snapshot of coating details at time of order';
COMMENT ON COLUMN orders.special_effects IS 'Snapshot of special effects at time of order';
COMMENT ON COLUMN orders.pasting_type IS 'Snapshot of pasting type at time of order';
COMMENT ON COLUMN orders.construction_type IS 'Snapshot of construction type at time of order';
COMMENT ON COLUMN orders.specification IS 'Snapshot of specification details at time of order';
COMMENT ON COLUMN orders.artwork_code IS 'Snapshot of artwork code at time of order';
COMMENT ON COLUMN orders.delivery_address IS 'Snapshot of delivery address at time of order';
COMMENT ON COLUMN orders.artwork_pdf IS 'Snapshot of artwork PDF path at time of order';
COMMENT ON COLUMN orders.artwork_cdr IS 'Snapshot of artwork CDR path at time of order';
