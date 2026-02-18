const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
lines.forEach(l => {
    const parts = l.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== CHECKING ORDER COLUMNS ===\n');

    // Get one S One Trio order to see all columns
    const { data: products } = await supabase
        .from('products')
        .select('id')
        .ilike('product_name', '%S One Trio 20 Carton%')
        .single();

    if (!products) {
        console.log('Product not found');
        return;
    }

    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('product_id', products.id)
        .limit(1)
        .single();

    if (order) {
        console.log('ORDER COLUMNS:');
        console.log(`  order_id: ${order.order_id}`);
        console.log(`  special_effects: "${order.special_effects}"`);
        console.log(`  specs: "${order.specs}"`);
        console.log(`  product_name: "${order.product_name}"`);
        console.log('');

        // Get the product to see what specs should be
        const { data: product } = await supabase
            .from('products')
            .select('specs, special_effects')
            .eq('id', products.id)
            .single();

        console.log('PRODUCT DATA:');
        console.log(`  special_effects: "${product.special_effects}"`);
        console.log(`  specs: "${product.specs}"`);
        console.log('');

        console.log('ISSUE FOUND:');
        console.log('  Orders.special_effects shows ID instead of name');
        console.log('  Orders.specs is not synced from product');
    }
})();
