const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('--- FINAL SYNC AUDIT: LivaDrine ---');

    // 1. Fetch Product
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, specs, special_effects')
        .ilike('product_name', '%LivaDrine%')
        .ilike('product_name', '%Outer%')
        .limit(1);

    if (!products || products.length === 0) {
        console.log('LivaDrine product not found.');
        return;
    }

    const p = products[0];
    console.log('--- PRODUCT DATA ---');
    console.log('Name: ', p.product_name);
    console.log('EF IDs: ', p.special_effects);
    console.log('Specs: ', p.specs);

    // 2. Fetch Linked Orders
    const { data: orders } = await supabase
        .from('orders')
        .select('id, order_id, specs')
        .eq('product_id', p.id);

    console.log('\n--- ORDERS DATA ---');
    if (orders && orders.length > 0) {
        orders.forEach(o => {
            console.log(`Order #${o.order_id || 'N/A'}: ${o.specs}`);
        });
    }

    // 3. Check for any products with IDs in specs instead of names
    const { data: rawEf } = await supabase.from('special_effects').select('id, name');
    console.log('\nLookup Table (Special Effects):', rawEf.slice(0, 5).map(e => `${e.id}:${e.name}`).join(', '));

})();
