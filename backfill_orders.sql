-- Backfill existing orders with product specification snapshots
-- This populates the blank columns for all previous orders

UPDATE orders o
SET 
    customer_name = e.customer_name,
    paper_type_name = e.paper_type_name,
    gsm_value = e.gsm_value,
    print_size = e.print_size,
    dimension = e.dimension,
    ink = e.ink,
    plate_no = e.plate_no,
    coating = e.coating,
    special_effects = e.special_effects,
    pasting_type = e.pasting_type,
    construction_type = e.construction_type,
    specification = e.specification,
    artwork_code = e.artwork_code,
    delivery_address = e.delivery_address,
    artwork_pdf = p.artwork_pdf,
    artwork_cdr = p.artwork_cdr
FROM orders_enhanced e
JOIN products p ON e.product_id = p.id
WHERE o.id = e.id;

-- Verification query
SELECT id, order_id, customer_name, paper_type_name, artwork_code 
FROM orders 
LIMIT 5;
