# Order Field Mapping & Formulas

Please use this document to specify the logic, formula, or source for each field. I will implement the logic in the code based on your input here.

| # | Column Name | Current Source / Formula | Your Instruction / Change |
|:---|:---|:---|:---|
| 1 | **order_id** | Manual Input (Job No/ID) |auto generate | 
| 2 | **order_date** | Date picker (Default: Today) | ok|
| 3 | **quantity** | Manual Input | ok |
| 4 | **rate** | Manual Input |ok |
| 5 | **value** | `quantity * rate` |ok |
| 6 | **status** | Dropdown (In Production, Complete, Hold) |ok |
| 7 | **progress** | Dropdown (Paper, Plate, Print, Varnish, Foil, Emboss, Punching, Pasting, Ready) | ok |
| 8 | **batch_no** | Suggested: `(Product Name 6 chars) + (Category initial)` | Product Name 6 chars) + delivery date without "/"or"-" + (Category initial)|
| 9 | **gross_print_qty** | `quantity / product_ups` |ok |
| 10 | **extra** | Manual Input |ok |
| 11 | **total_print_qty** | `gross_print_qty + extra` |ok |
| 12 | **paper_ups** | Manual Input | |
| 13 | **paper_required** | `total_print_qty / paper_ups` |ok |
| 14 | **paper_order_qty** | Manual Input |ok |
| 15 | **paper_order_size** | Manual Input |drop-down from table size  |
| 16 | **printer_name** | Manual Input |dropdown from  |
| 17 | **printer_mobile** | Manual (Usually from printer lookup) | not manual from printer lookup)|
| 18 | **paperwala_name** | Manual Input |drop-down from table paperwala |
| 19 | **paperwala_mobile** | Manual Input |not manual from ppaperwala lookupd |
| 20 | **customer_name** | **Snapshot** from Product |ok |
| 21 | **paper_type_name** | **Snapshot** from Product |ok |
| 22 | **gsm_value** | **Snapshot** from Product |ok |
| 23 | **print_size** | **Snapshot** from Product |ok |
| 24 | **dimension** | **Snapshot** from Product |ok |
| 25 | **ink** | **Snapshot** from Product |ok |
| 26 | **plate_no** | **Snapshot** from Product |ok |
| 27 | **coating** | **Snapshot** from Product |ok |
| 28 | **special_effects** | **Snapshot** from Product |ok |
| 29 | **pasting_type** | **Snapshot** from Product |ok|
| 30 | **construction_type** | **Snapshot** from Product |ok |
| 31 | **specification** | **Snapshot** from Product |ok |
| 32 | **artwork_code** | **Snapshot** from Product |ok |
| 33 | **delivery_address** | **Snapshot** from Product | ok|
| 34 | **artwork_pdf** | **Snapshot** from Product (Link) |ok |
| 35 | **artwork_cdr** | **Snapshot** from Product (Link) |ok |
| 36 | **from_our_company** | Dropdown (Printers, Packaging, Enterprise) |ok |
| 37 | **billed** | Toggle (true / false) |ok |
| 38 | **ready_date** | Date picker |ok |
| 39 | **delivery_date** | Date picker |ok |
| 40 | **qty_delivered** | Manual Input |ok |
| 41 | **invoice_no** | Manual Input |ok |
| 42 | **packing_detail** | Manual Input |ok |
| 43 | **automation** | Manual Input |ok |
| 44 | **file_no** | Manual Input |ok |
| 45 | **folding_dimension**| Manual Input |snapshot from product |
| 46 | **shade_card** | Manual Input |ok |
| 47 | **shade_card_file** | File Upload (Link) |ok|
| 48 | **coa_file** | File Upload (Link) |ok |
| 49 | **del_label_file** | File Upload (Link) |ok|
| 50 | **product_image** | **Snapshot** from Product (Link) |ok |
| 51 | **ready_delivery** | Manual Input |ok |
| 52 | **cdr** | Old field (Legacy) |not required  |
| 53 | **product_sku** | Manual/Auto from Product | ok dont show |
| 54 | **product_id** | Link to Product table | product name is required with sshoud be dropdown from product table  |
| 55 | **created_at** | System Auto |ok |
| 56 | **updated_at** | System Auto |ok |
