const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const env = {};
try {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) {
    console.warn('No .env.local found');
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('--- CHECKING SPECIFIC PRODUCT: LivaDrine ---');

    // 1. Find the product
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, product_name, specs, special_effects, coating, ups')
        .ilike('product_name', '%LivaDrine%')
        .ilike('product_name', '%Outer%')
        // Trying to match "LivaDrine 2.5mg outer Cartons" loosely
        .limit(5);

    if (prodError) {
        console.error('Error fetching product:', prodError);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No matching product found for "LivaDrine%Outer%". Listing *any* LivaDrine products:');
        const { data: allLiva } = await supabase.from('products').select('product_name').ilike('product_name', '%LivaDrine%').limit(5);
        console.table(allLiva);
        return;
    }

    const targetProduct = products[0];
    console.log('\nTARGET PRODUCT DB DATA:');
    console.log(`ID: ${targetProduct.id}`);
    console.log(`Name: ${targetProduct.product_name}`);
    console.log(`Specs (Source): ${targetProduct.specs}`);
    console.log(`Special Effects: ${targetProduct.special_effects}`);

    // 2. Find linked orders
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('id, order_id, product_name, specs, special_effects, created_at')
        .eq('product_id', targetProduct.id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (orderError) {
        console.error('Error fetching orders:', orderError);
        return;
    }

    console.log('\nLINKED ORDERS DB DATA (Top 5 recent):');
    if (orders.length === 0) {
        console.log('No orders found for this product.');
    } else {
        orders.forEach(o => {
            console.log(`\n--------------------------------------------------`);
            console.log(`Order ID: ${o.id} (Ref: ${o.order_id || 'N/A'})`);
            console.log(`Name    : ${o.product_name}`);
            console.log(`Specs   : ${o.specs}`);

            // Check match
            const match = o.specs === targetProduct.specs;
            console.log(`STATUS  : ${match ? 'MATCH [OK]' : 'MISMATCH [FAIL]'}`);
            if (!match) {
                console.log(`EXPECTED: "${targetProduct.specs}"`);
            }
        });
    }
})();
