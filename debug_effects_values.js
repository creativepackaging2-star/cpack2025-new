const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
    // 1. Get Special Effects Lookup
    const { data: effects } = await supabase.from('special_effects').select('*');

    // Create Map
    const effectMap = {};
    console.log("--- Special Effects Map ---");
    effects.forEach(e => {
        effectMap[e.id] = e.name;
        console.log(`ID: ${e.id} => Name: ${e.name}`);
    });
    console.log("---------------------------\n");


    // 2. Find Product
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .ilike('product_name', '%S One Trio 20 Carton%');

    if (products && products.length > 0) {
        const p = products[0];
        console.log(`PRODUCT: ${p.product_name}`);
        console.log(`RAW special_effects: "${p.special_effects}"`);

        // Simulate Frontend Logic
        const parts = (p.special_effects || '').split(/[|/]/).map(s => s.trim()).filter(Boolean);
        console.log(`Parsed Parts: ${JSON.stringify(parts)}`);

        const resolved = parts.map(id => {
            const numId = parseInt(id);
            const name = effectMap[numId];
            return name ? `[${numId}] -> ${name}` : `[${numId}] -> NOT FOUND`;
        });
        console.log(`Resolved: ${resolved.join(', ')}`);

        // Check orders
        const { data: orders } = await supabase.from('orders').select('id, special_effects').eq('product_id', p.id);
        console.log(`\nORDERS (${orders.length}):`);
        orders.forEach(o => {
            console.log(`Order ${o.id}: special_effects="${o.special_effects}"`);
        });
    } else {
        console.log("Product not found.");
    }

})();
