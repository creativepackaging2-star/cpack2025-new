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
    const { data: products } = await supabase.from('products')
        .select('*')
        .ilike('product_name', '%S One Trio%');

    console.log('--- S ONE TRIO PRODUCTS ---');
    products.forEach(p => {
        console.log(`Product: ${p.product_name}`);
        console.log(`ID: ${p.id}`);
        console.log(`Special Effects: ${p.special_effects}`);
        console.log(`Specs: ${p.specs}`);
        console.log('---');
    });

    const { data: orders } = await supabase.from('orders')
        .select('id, order_id, specs, special_effects, product_id')
        .ilike('product_name', '%S One Trio%');

    console.log('\n--- S ONE TRIO ORDERS ---');
    orders.forEach(o => {
        console.log(`Order ID: ${o.id}, Job ID: ${o.order_id}`);
        console.log(`Product ID (fk): ${o.product_id}`);
        console.log(`Specs (snapshot): ${o.specs}`);
        console.log(`Special Effects (snapshot): ${o.special_effects}`);
        console.log('---');
    });

    const { data: effects } = await supabase.from('special_effects').select('*');
    console.log('\n--- SPECIAL EFFECTS MAP ---');
    effects.forEach(e => console.log(`${e.id}: ${e.name}`));
})();
