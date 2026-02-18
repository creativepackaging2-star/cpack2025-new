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
    console.log('=== SYNCING UPS FROM ORDERS TO PRODUCTS ===\n');

    // First, check what columns exist in orders table
    const { data: sampleOrder, error: sampleError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (sampleError) {
        console.error('Error fetching sample order:', sampleError);
        return;
    }

    if (sampleOrder && sampleOrder.length > 0) {
        console.log('Available columns in orders table:');
        console.log(Object.keys(sampleOrder[0]).join(', '));
        console.log('\n');
    }

    // Get all orders with UPS values
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('product_id, product_sku, ups')
        .not('ups', 'is', null);

    if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
    }

    console.log(`Found ${orders.length} orders with UPS values\n`);

    // Group by product_id to get the most common UPS value for each product
    const productUpsMap = {};
    orders.forEach(order => {
        if (order.product_id) {
            if (!productUpsMap[order.product_id]) {
                productUpsMap[order.product_id] = {};
            }
            const ups = order.ups;
            productUpsMap[order.product_id][ups] = (productUpsMap[order.product_id][ups] || 0) + 1;
        }
    });

    // For each product, pick the most common UPS value
    const productUpdates = [];
    for (const [productId, upsCount] of Object.entries(productUpsMap)) {
        const mostCommonUps = Object.entries(upsCount)
            .sort((a, b) => b[1] - a[1])[0][0];
        productUpdates.push({ id: parseInt(productId), ups: parseInt(mostCommonUps) });
    }

    console.log(`Will update ${productUpdates.length} products\n`);

    let updated = 0;
    let failed = 0;

    // Update products
    for (const update of productUpdates) {
        const { error: updateError } = await supabase
            .from('products')
            .update({ ups: update.ups })
            .eq('id', update.id);

        if (updateError) {
            console.error(`Error updating product ${update.id}:`, updateError);
            failed++;
        } else {
            updated++;
            if (updated % 10 === 0) {
                console.log(`Updated ${updated} products...`);
            }
        }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`\nNote: The specs column will automatically regenerate if it's a generated column.`);
})();
