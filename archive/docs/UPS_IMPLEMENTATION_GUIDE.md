# UPS Implementation Guide

## Objective
1. Add UPS values to product `specs` column (after size)
2. Ensure product data (including UPS) flows to orders table when orders are created
3. Backfill existing orders with product data

## Solution Overview

### Part 1: Update Product Specs to Include UPS

**File:** `update_specs_simple.sql`

This SQL script will:
- Update the `specs` column in products to include UPS after the size
- Format: `"Size | UPS: X | Dimension | Special Effects"`
- Create a trigger so specs auto-updates when product data changes

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `update_specs_simple.sql`
3. Execute the SQL

### Part 2: Sync Product Data to Orders

**File:** `complete_product_to_order_sync.sql`

This SQL script will:
- Ensure orders table has columns for product snapshots (`product_ups`, `product_specs`, etc.)
- Create a trigger that automatically copies product data to orders when new orders are created
- Backfill all existing orders with current product data

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `complete_product_to_order_sync.sql`
3. Execute the SQL

## Verification

Run the verification script to check everything is working:

```bash
node verify_ups_in_specs.js
```

Expected output:
- ✅ All products should show UPS in their specs
- Orders should have `ups`, `product_ups`, and `specs` columns populated

## Files Created

| File | Purpose |
|------|---------|
| `update_specs_simple.sql` | Updates product specs to include UPS |
| `complete_product_to_order_sync.sql` | Syncs product data to orders (old & new) |
| `verify_ups_in_specs.js` | Verification script |

## What Happens Going Forward

### When a new product is created:
- The `specs` column will automatically include UPS (via trigger)

### When a new order is created:
- All product data (UPS, specs, dimension, etc.) will be automatically copied to the order (via trigger)
- This creates a snapshot so order data doesn't change if product is updated later

### When a product is updated:
- The `specs` column will automatically regenerate (via trigger)
- Existing orders are NOT updated (they keep their snapshot)
