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
    console.log('=== CURRENT STATE CHECK ===\n');

    // Get S One Trio product
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .ilike('product_name', '%S One Trio 20 Carton%');

    if (!products || products.length === 0) {
        console.log('Product not found');
        return;
    }

    const p = products[0];
    console.log(`PRODUCT: ${p.product_name}`);
    console.log(`  special_effects: "${p.special_effects}"`);
    console.log('');

    // Get orders
    const { data: orders } = await supabase
        .from('orders')
        .select('id, order_id, special_effects')
        .eq('product_id', p.id);

    console.log(`ORDERS (${orders.length} total):`);
    orders.forEach(o => {
        console.log(`  Order ${o.order_id}: "${o.special_effects}"`);
    });
    console.log('');

    // Get all special effects to understand the mapping
    const { data: effects } = await supabase.from('special_effects').select('*');
    console.log('SPECIAL EFFECTS LOOKUP:');
    effects.forEach(e => console.log(`  ${e.id}: ${e.name}`));
})();
