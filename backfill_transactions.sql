-- Backfill printer_id and paper_order_size_id from orders into paper_transactions
-- Matches using the 'reference' column (which contains the order_id)

UPDATE "public"."paper_transactions" pt
SET 
    printer_id = o.printer_id,
    paper_order_size_id = o.paper_order_size_id
FROM "public"."orders" o
WHERE pt.reference = o.order_id
AND (pt.printer_id IS NULL OR pt.paper_order_size_id IS NULL);

-- Also fix any records where paper_type_id or gsm_id might be missing (optional)
UPDATE "public"."paper_transactions" pt
SET 
    paper_type_id = p.paper_type_id,
    gsm_id = p.gsm_id
FROM "public"."orders" o
JOIN "public"."products" p ON o.product_id = p.id
WHERE pt.reference = o.order_id
AND (pt.paper_type_id IS NULL OR pt.gsm_id IS NULL);
