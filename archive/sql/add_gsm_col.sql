
-- Add actual_gsm_used column to orders table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'actual_gsm_used') THEN 
        ALTER TABLE orders ADD COLUMN actual_gsm_used text; 
    END IF; 
END $$;
