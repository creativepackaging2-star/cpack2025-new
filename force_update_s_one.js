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
    console.log('=== FORCE UPDATE S ONE TRIO ORDERS ===\n');

    // Get product
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .ilike('product_name', '%S One Trio 20 Carton%');

    if (!products || products.length === 0) {
        console.log('Product not found');
        return;
    }

    const p = products[0];
    console.log(`Product: ${p.product_name}`);
    console.log(`Product special_effects: "${p.special_effects}"`);

    // Resolve the ID to name
    const { data: effects } = await supabase.from('special_effects').select('*');
    const effectMap = {};
    effects.forEach(e => effectMap[e.id] = e.name);

    // Parse product special_effects
    const ids = p.special_effects.split('|').map(s => s.trim());
    const names = ids.map(id => effectMap[id] || id);
    const correctValue = names.join(' | ');

    console.log(`Correct order value should be: "${correctValue}"`);
    console.log('');

    // Update ALL orders for this product
    const { data: orders, error: fetchErr } = await supabase
        .from('orders')
        .select('id, order_id, special_effects')
        .eq('product_id', p.id);

    if (fetchErr) {
        console.error('Error fetching orders:', fetchErr);
        return;
    }

    console.log(`Found ${orders.length} orders. Updating...`);

    const { error: updateErr } = await supabase
        .from('orders')
        .update({ special_effects: correctValue })
        .eq('product_id', p.id);

    if (updateErr) {
        console.error('Update failed:', updateErr);
    } else {
        console.log(`✅ Successfully updated ${orders.length} orders`);
        console.log(`All orders now show: "${correctValue}"`);
    }

    console.log('\n=== VERIFICATION ===');
    const { data: verify } = await supabase
        .from('orders')
        .select('order_id, special_effects')
        .eq('product_id', p.id)
        .limit(3);

    verify.forEach(o => {
        console.log(`Order ${o.order_id}: "${o.special_effects}"`);
    });
})();
