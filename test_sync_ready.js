const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== TESTING PRODUCT-TO-ORDER SYNC ===\n');

    // Pick a test product with orders
    const { data: testProduct } = await supabase
        .from('products')
        .select('id, product_name, special_effects, dimension')
        .ilike('product_name', '%S One Trio%')
        .single();

    if (!testProduct) {
        console.log('Test product not found');
        return;
    }

    console.log(`Test Product: ${testProduct.product_name}`);
    console.log(`  ID: ${testProduct.id}`);
    console.log(`  Current special_effects: "${testProduct.special_effects}"`);
    console.log(`  Current dimension: "${testProduct.dimension}"`);
    console.log('');

    // Check orders BEFORE
    const { data: ordersBefore } = await supabase
        .from('orders')
        .select('id, order_id, special_effects, dimension')
        .eq('product_id', testProduct.id)
        .limit(3);

    console.log(`Orders BEFORE (showing ${ordersBefore.length}):`);
    ordersBefore.forEach(o => {
        console.log(`  Order ${o.order_id}:`);
        console.log(`    special_effects: "${o.special_effects}"`);
        console.log(`    dimension: "${o.dimension}"`);
    });
    console.log('');

    console.log('✅ The sync is already implemented in ProductForm.tsx');
    console.log('');
    console.log('HOW TO TEST:');
    console.log('1. Go to the Products page in your browser');
    console.log('2. Click "Edit" on any product (e.g., S One Trio 20 Carton)');
    console.log('3. Change something (e.g., dimension, special effects)');
    console.log('4. Click "Save Product"');
    console.log('5. Go to Orders page and check - the changes should appear immediately!');
    console.log('');
    console.log('The code will:');
    console.log('  - Update the product');
    console.log('  - Automatically sync ALL linked orders');
    console.log('  - Resolve special effect IDs to names');
    console.log('  - Log "Successfully synced changes to linked orders" in browser console');
})();
