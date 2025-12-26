const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
    console.log('=== UPDATING ORDERS WITH PRODUCT DATA ===\n');

    // 1. Get all products
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, ups, specs, dimension, special_effects');

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }

    console.log(`Loaded ${products.length} products.\n`);

    // Create a lookup map for faster access
    const productMap = {};
    products.forEach(p => {
        productMap[p.id] = p;
    });

    // 2. Get all orders
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, product_id')
        .not('product_id', 'is', null);

    if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
    }

    console.log(`Loaded ${orders.length} orders with product_id.\n`);

    let updatedCount = 0;
    let errorCount = 0;

    // 3. Update orders in batches
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const product = productMap[order.product_id];

        if (product) {
            // Attempt to update
            // We cast ups to number just in case the column is an integer
            const upsValue = product.ups ? parseInt(product.ups) : null;

            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    ups: isNaN(upsValue) ? null : upsValue,
                    product_ups: isNaN(upsValue) ? null : upsValue,
                    specs: product.specs,
                    product_specs: product.specs,
                    dimension: product.dimension,
                    special_effects: product.special_effects
                })
                .eq('id', order.id);

            if (updateError) {
                console.error(`Error updating order ${order.id}:`, updateError.message);
                errorCount++;
            } else {
                updatedCount++;
            }
        }

        if ((i + 1) % 50 === 0 || (i + 1) === orders.length) {
            console.log(`Progress: ${i + 1}/${orders.length} orders processed...`);
        }
    }

    console.log(`\n=== UPDATE COMPLETE ===`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
})();
