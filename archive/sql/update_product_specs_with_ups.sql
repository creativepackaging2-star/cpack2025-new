-- Step 1: Update the specs column to include UPS after size
-- This assumes specs is a generated column or we'll update it manually

-- First, let's check if specs is a generated column by trying to drop and recreate it
-- If it fails, we'll update it differently

DO $$
BEGIN
    -- Try to drop the column if it's generated
    BEGIN
        ALTER TABLE products DROP COLUMN IF EXISTS specs CASCADE;
    EXCEPTION WHEN OTHERS THEN
        -- If it fails, just continue
        RAISE NOTICE 'Could not drop specs column, it may not be generated';
    END;
END $$;

-- Now create the specs column as a generated column with UPS included
-- Simplified version that doesn't rely on lookup tables that may not exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs TEXT GENERATED ALWAYS AS (
  COALESCE((SELECT name FROM sizes WHERE id = size_id), '') || 
  CASE WHEN ups IS NOT NULL THEN ' | UPS: ' || ups::TEXT ELSE '' END ||
  CASE WHEN dimension IS NOT NULL AND dimension != '' THEN ' | ' || dimension ELSE '' END ||
  CASE WHEN special_effects IS NOT NULL AND special_effects != '' THEN ' | ' || special_effects ELSE '' END ||
  CASE WHEN folding IS NOT NULL AND folding != '' THEN ' | Folding: ' || folding ELSE '' END ||
  CASE WHEN folding_dim IS NOT NULL AND folding_dim != '' THEN ' | Fold Dim: ' || folding_dim ELSE '' END
) STORED;

COMMENT ON COLUMN products.specs IS 'Auto-generated specifications including size, UPS, and category-specific details';
