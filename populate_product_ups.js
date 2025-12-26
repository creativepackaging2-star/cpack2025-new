const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== POPULATING PRODUCT_UPS IN ORDERS ===\n');

    // Get all products with their UPS values
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, sku, ups');

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }

    console.log(`Loaded ${products.length} products\n`);

    // Create a map of product_id -> ups
    const productUpsMap = {};
    products.forEach(p => {
        productUpsMap[p.id] = p.ups;
    });

    // Get all orders
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, product_id, product_sku');

    if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
    }

    console.log(`Loaded ${orders.length} orders\n`);

    let updated = 0;
    let skipped = 0;

    // Update orders in batches
    for (const order of orders) {
        if (!order.product_id) {
            skipped++;
            continue;
        }

        const ups = productUpsMap[order.product_id];

        if (ups !== undefined && ups !== null) {
            const { error: updateError } = await supabase
                .from('orders')
                .update({ product_ups: ups })
                .eq('id', order.id);

            if (updateError) {
                console.error(`Error updating order ${order.id}:`, updateError);
            } else {
                updated++;
                if (updated % 50 === 0) {
                    console.log(`Updated ${updated} orders...`);
                }
            }
        } else {
            skipped++;
        }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Total orders updated: ${updated}`);
    console.log(`Skipped (no product_id or UPS): ${skipped}`);
})();
