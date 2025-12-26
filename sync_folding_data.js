const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

async function syncFoldingData() {
    console.log('Starting sync of folding data from Products to Orders...');

    // 1. Fetch all products with folding data
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, folding, folding_dim');

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }
    console.log(`Fetched ${products.length} products.`);

    // 2. Fetch all orders
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('id, product_id');

    if (orderError) {
        console.error('Error fetching orders:', orderError);
        return;
    }
    console.log(`Fetched ${orders.length} orders.`);

    // 3. Update orders
    let updatedCount = 0;
    for (const order of orders) {
        if (!order.product_id) continue;

        const product = products.find(p => p.id === order.product_id);
        if (product && (product.folding || product.folding_dim)) {
            // Attempt update - this will fail if columns don't exist
            const updates = {};
            if (product.folding) updates.folding = product.folding;
            if (product.folding_dim) updates.folding_dim = product.folding_dim;

            const { error: updateError } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', order.id);

            if (updateError) {
                // If error is related to missing column, we stop and warn
                if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
                    console.error('\nCRITICAL: The columns "folding" and/or "folding_dim" do NOT exist in the "orders" table.');
                    console.error('Please run the SQL script "add_folding_cols_and_sync.sql" in your Supabase SQL Editor first.');
                    return;
                }
                console.error(`Failed to update order ${order.id}:`, updateError.message);
            } else {
                updatedCount++;
                if (updatedCount % 10 === 0) process.stdout.write('.');
            }
        }
    }

    console.log(`\nSync complete. Updated ${updatedCount} orders.`);
}

syncFoldingData();
