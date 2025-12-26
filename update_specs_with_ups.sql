-- Update the specs column generation to include UPS after size
-- This updates the generated column logic

-- First, drop the existing generated column
ALTER TABLE products DROP COLUMN IF EXISTS specs;

-- Recreate it with UPS included after size
ALTER TABLE products ADD COLUMN specs TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN category = 'cartons' THEN
      COALESCE(print_size, '') || 
      CASE WHEN ups IS NOT NULL THEN ' | UPS: ' || ups::TEXT ELSE '' END ||
      CASE WHEN dimension IS NOT NULL THEN ' | ' || dimension ELSE '' END ||
      CASE WHEN pasting_type IS NOT NULL THEN ' | ' || pasting_type ELSE '' END ||
      CASE WHEN construction_type IS NOT NULL THEN ' | ' || construction_type ELSE '' END
    
    WHEN category = 'inserts' THEN
      COALESCE(print_size, '') || 
      CASE WHEN ups IS NOT NULL THEN ' | UPS: ' || ups::TEXT ELSE '' END ||
      CASE WHEN dimension IS NOT NULL THEN ' | ' || dimension ELSE '' END ||
      CASE WHEN folding IS NOT NULL THEN ' | Folding: ' || folding ELSE '' END ||
      CASE WHEN folding_dim IS NOT NULL THEN ' | Fold Dim: ' || folding_dim ELSE '' END
    
    WHEN category = 'labels' THEN
      COALESCE(print_size, '') || 
      CASE WHEN ups IS NOT NULL THEN ' | UPS: ' || ups::TEXT ELSE '' END ||
      CASE WHEN dimension IS NOT NULL THEN ' | ' || dimension ELSE '' END
    
    ELSE
      COALESCE(print_size, '') || 
      CASE WHEN ups IS NOT NULL THEN ' | UPS: ' || ups::TEXT ELSE '' END ||
      CASE WHEN dimension IS NOT NULL THEN ' | ' || dimension ELSE '' END
  END
) STORED;

COMMENT ON COLUMN products.specs IS 'Auto-generated specifications including size, UPS, and category-specific details';
