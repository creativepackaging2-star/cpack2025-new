export type Product = {
    id: string
    sku: string | null
    product_name: string | null
    artwork_code: string | null
    ups: number | null
    dimension: string | null
    ink: string | null
    plate_no: string | null
    folding: string | null
    folding_dim: string | null
    coating: string | null
    category_id: number | null
    customer_id: number | null
    paper_type_id: number | null
    gsm_id: number | null
    size_id: number | null
    construction_id: number | null
    specification_id: number | null
    delivery_address_id: number | null
    pasting_id: number | null
    created_at: string
    updated_at: string | null
    spec: string | null
    special_effects: string | null
    specs: string | null
    artwork_pdf: string | null
    artwork_cdr: string | null
    product_image: string | null
    actual_gsm_used: string | null
}

export type Order = {
    id: number
    order_id: string | null
    product_sku: string | null
    cdr: string | null
    order_date: string | null // Format: DD-MM-YY based on sample
    printer_name: string | null
    printer_mobile: string | null
    paperwala_name: string | null
    paperwala_mobile: string | null
    status: string | null
    quantity: number | null
    rate: number | null
    value: number | null
    gross_print_qty: number | null
    paper_ups: number | null
    total_print_qty: number | null
    extra: number | null
    paper_order_size: string | null
    paper_required: number | null
    paper_order_qty: number | null
    ready_delivery: string | null
    invoice_no: string | null
    qty_delivered: number | null
    packing_detail: string | null
    ready_date: string | null
    delivery_date: string | null
    batch_no: string | null
    from_our_company: string | null
    billed: string | null
    shade_card: string | null
    shade_card_file: string | null
    del_label_file: string | null
    coa_file: string | null
    product_image: string | null
    automation: string | null
    file_no: string | null
    progress: string | null
    folding_dimension: string | null
    product_id: string | null // UUID from products table
    created_at: string
    updated_at: string
}
