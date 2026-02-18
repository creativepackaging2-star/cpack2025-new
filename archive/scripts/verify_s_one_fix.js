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
    console.log('=== VERIFICATION: S One Trio 20 Carton ===\n');

    // 1. Check Product
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .ilike('product_name', '%S One Trio 20 Carton%');

    if (products && products.length > 0) {
        const p = products[0];
        console.log('PRODUCT:');
        console.log(`  Name: ${p.product_name}`);
        console.log(`  ID: ${p.id}`);
        console.log(`  special_effects: "${p.special_effects}"`);
        console.log('');

        // 2. Check Orders
        const { data: orders } = await supabase
            .from('orders')
            .select('id, order_id, special_effects')
            .eq('product_id', p.id)
            .limit(3);

        console.log(`ORDERS (showing first 3 of ${orders.length}):`);
        orders.forEach(o => {
            console.log(`  Order ${o.order_id}: special_effects="${o.special_effects}"`);
        });

        // 3. Check if it's displaying correctly
        console.log('\n--- DISPLAY CHECK ---');
        const raw = p.special_effects;
        if (raw && !raw.startsWith('[')) {
            console.log('✓ Product format is correct (pipe-separated)');

            // Simulate frontend resolution
            const parts = raw.split('|').map(s => s.trim());
            console.log(`  Parsed parts: ${JSON.stringify(parts)}`);

            // Check if numeric (needs resolution) or already names
            if (parts.every(p => /^\d+$/.test(p))) {
                console.log('  ⚠️  Still contains IDs - needs name resolution');
                const { data: effects } = await supabase.from('special_effects').select('*');
                const resolved = parts.map(id => {
                    const match = effects.find(e => String(e.id) === id);
                    return match ? match.name : id;
                });
                console.log(`  Should display as: ${resolved.join(' | ')}`);
            } else {
                console.log(`  ✓ Already contains names: ${parts.join(' | ')}`);
            }
        } else {
            console.log('❌ Product still has JSON format!');
        }

        // Check orders
        if (orders.length > 0 && orders[0].special_effects) {
            const orderVal = orders[0].special_effects;
            if (/^\d+(\|\d+)*$/.test(orderVal)) {
                console.log('❌ Orders still contain IDs instead of names');
            } else {
                console.log('✓ Orders contain human-readable names');
            }
        }
    } else {
        console.log('Product not found!');
    }
})();
