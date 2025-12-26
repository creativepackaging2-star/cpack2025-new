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
    console.log('=== FINAL UPDATE: ORDERS DATA SYNC ===\n');

    // 1. Get all products with their data
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*');

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }

    console.log(`Loaded ${products.length} products.\n`);

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

    console.log(`Loaded ${orders.length} orders to update.\n`);

    let updatedCount = 0;
    let errorCount = 0;

    // 3. Update orders one by one (safest for cross-platform types)
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const product = productMap[order.product_id];

        if (product) {
            // Match the data types
            // products.ups is a string, but orders.ups might be integer?
            // Let's try to pass it as it is first.

            const updateData = {
                specs: product.specs,
                ups: product.ups ? parseInt(product.ups) : null,
                dimension: product.dimension,
                special_effects: product.special_effects,
                ink: product.ink,
                plate_no: product.plate_no
            };

            // Remove nulls/NaNs that might cause issues if types are strict
            if (isNaN(updateData.ups)) updateData.ups = null;

            const { error: updateError } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id);

            if (updateError) {
                console.error(`Error on order ${order.id}:`, updateError.message);
                errorCount++;
            } else {
                updatedCount++;
            }
        }

        if ((i + 1) % 50 === 0 || (i + 1) === orders.length) {
            console.log(`Progress: ${i + 1}/${orders.length} processed...`);
        }
    }

    console.log(`\n=== UPDATE COMPLETE ===`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
})();
