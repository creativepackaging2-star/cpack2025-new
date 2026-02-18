-- Check if actual_gsm_used column exists in orders table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name LIKE '%gsm%';
