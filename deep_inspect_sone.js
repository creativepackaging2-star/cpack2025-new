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
    console.log('--- DEEP INSPECTION: S ONE TRIO ---');

    // 1. Get Special Effects map for our own resolution
    const { data: effects } = await supabase.from('special_effects').select('*');
    const effectMap = {};
    effects.forEach(e => effectMap[e.id] = e.name);

    // 2. Get Product details
    const { data: products } = await supabase.from('products')
        .select('id, product_name, special_effects, specs, dimension, ups, size_id')
        .ilike('product_name', '%S One Trio%');

    if (!products || products.length === 0) {
        console.log('No S One Trio products found.');
        return;
    }

    for (const p of products) {
        console.log(`\nPRODUCT [${p.id}]`);
        console.log(`Name: ${p.product_name}`);
        console.log(`Raw special_effects: "${p.special_effects}"`);
        console.log(`Raw specs: "${p.specs}"`);

        const ids = (p.special_effects || '').split('|').map(s => s.trim()).filter(Boolean);
        const resolvedNames = ids.map(id => effectMap[id] || id).join(' | ');
        console.log(`Resolved Effects: "${resolvedNames}"`);

        // Check if DB specs contains Foil - Red (147) while special_effects is 4
        if (p.specs && p.specs.includes('Foil - Red') && !ids.includes('147')) {
            console.log('!!! ROOT REASON FOUND: Product specs column is STALE. It contains "Foil - Red" but special_effects does not.');
        }
    }

    // 3. Get Order details
    const { data: orders } = await supabase.from('orders')
        .select('id, order_id, product_id, product_name, specs, special_effects')
        .ilike('product_name', '%S One Trio%');

    console.log('\n--- ORDERS SNAPSHOT ---');
    orders.forEach(o => {
        console.log(`Order: ${o.order_id} (ID: ${o.id})`);
        console.log(`  Specs: "${o.specs}"`);
        console.log(`  Effects: "${o.special_effects}"`);
    });

})();
