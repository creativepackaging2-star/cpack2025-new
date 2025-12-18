# Order Field Mapping & Formulas

Please use this document to specify the logic, formula, or source for each field. I will implement the logic in the code based on your input here.

| # | Column Name | Current Source / Formula | Your Instruction / Change |
|:---|:---|:---|:---|
| 1 | **order_id** | Manual Input (Job No/ID) | |
| 2 | **order_date** | Date picker (Default: Today) | |
| 3 | **quantity** | Manual Input | |
| 4 | **rate** | Manual Input | |
| 5 | **value** | `quantity * rate` | |
| 6 | **status** | Dropdown (In Production, Complete, Hold) | |
| 7 | **progress** | Dropdown (Paper, Plate, Print, Varnish, Foil, Emboss, Punching, Pasting, Ready) | |
| 8 | **batch_no** | Suggested: `(Product Name 6 chars) + (Category initial)` | |
| 9 | **gross_print_qty** | `quantity / product_ups` | |
| 10 | **extra** | Manual Input | |
| 11 | **total_print_qty** | `gross_print_qty + extra` | |
| 12 | **paper_ups** | Manual Input | |
| 13 | **paper_required** | `total_print_qty / paper_ups` | |
| 14 | **paper_order_qty** | Manual Input | |
| 15 | **paper_order_size** | Manual Input | |
| 16 | **printer_name** | Manual Input | |
| 17 | **printer_mobile** | Manual (Usually from printer lookup) | |
| 18 | **paperwala_name** | Manual Input | |
| 19 | **paperwala_mobile** | Manual Input | |
| 20 | **customer_name** | **Snapshot** from Product | |
| 21 | **paper_type_name** | **Snapshot** from Product | |
| 22 | **gsm_value** | **Snapshot** from Product | |
| 23 | **print_size** | **Snapshot** from Product | |
| 24 | **dimension** | **Snapshot** from Product | |
| 25 | **ink** | **Snapshot** from Product | |
| 26 | **plate_no** | **Snapshot** from Product | |
| 27 | **coating** | **Snapshot** from Product | |
| 28 | **special_effects** | **Snapshot** from Product | |
| 29 | **pasting_type** | **Snapshot** from Product | |
| 30 | **construction_type** | **Snapshot** from Product | |
| 31 | **specification** | **Snapshot** from Product | |
| 32 | **artwork_code** | **Snapshot** from Product | |
| 33 | **delivery_address** | **Snapshot** from Product | |
| 34 | **artwork_pdf** | **Snapshot** from Product (Link) | |
| 35 | **artwork_cdr** | **Snapshot** from Product (Link) | |
| 36 | **from_our_company** | Dropdown (Printers, Packaging, Enterprise) | |
| 37 | **billed** | Toggle (true / false) | |
| 38 | **ready_date** | Date picker | |
| 39 | **delivery_date** | Date picker | |
| 40 | **qty_delivered** | Manual Input | |
| 41 | **invoice_no** | Manual Input | |
| 42 | **packing_detail** | Manual Input | |
| 43 | **automation** | Manual Input | |
| 44 | **file_no** | Manual Input | |
| 45 | **folding_dimension**| Manual Input | |
| 46 | **shade_card** | Manual Input | |
| 47 | **shade_card_file** | File Upload (Link) | |
| 48 | **coa_file** | File Upload (Link) | |
| 49 | **del_label_file** | File Upload (Link) | |
| 50 | **product_image** | **Snapshot** from Product (Link) | |
| 51 | **ready_delivery** | Manual Input | |
| 52 | **cdr** | Old field (Legacy) | |
| 53 | **product_sku** | Manual/Auto from Product | |
| 54 | **product_id** | Link to Product table | |
| 55 | **created_at** | System Auto | |
| 56 | **updated_at** | System Auto | |
