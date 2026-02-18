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
    console.log('Fixing S One Trio 20 Carton orders...');

    // 1. Find the product
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .ilike('product_name', '%S One Trio 20 Carton%');

    if (!products || products.length === 0) {
        console.log('Product not found!');
        return;
    }

    const p = products[0];
    console.log(`Found Product: ${p.product_name} (ID: ${p.id})`);
    console.log(`Current special_effects: ${p.special_effects}`);

    // 2. Resolve Special Effects (Hardcoded fix for "147" -> "Foil - Red" if needed, or lookup)
    // We know 147 is Foil - Red.
    // But let's be dynamic if possible.
    let resolvedName = p.special_effects;

    // Check if it looks like an ID
    if (/^\d+$/.test(p.special_effects) || /^\d+(\|\d+)*$/.test(p.special_effects)) {
        console.log('Detecting IDs. Resolving...');
        const ids = p.special_effects.split('|');
        const { data: effects } = await supabase.from('special_effects').select('id, name').in('id', ids);

        if (effects) {
            const names = ids.map(id => {
                const match = effects.find(e => String(e.id) === String(id));
                return match ? match.name : id;
            });
            resolvedName = names.join(' | ');
            console.log(`Resolved to: "${resolvedName}"`);
        }
    }

    // 3. Update Orders
    console.log('Updating orders...');
    const { data: orders, error: fetchErr } = await supabase.from('orders').select('id').eq('product_id', p.id);

    if (fetchErr) {
        console.error('Error fetching orders:', fetchErr);
        return;
    }

    console.log(`Found ${orders.length} orders.`);

    // Update product itself to ensure it is clean? No, product stores IDs usually.
    // ONLY update ORDERS to have the Name.

    const { error: updateErr } = await supabase
        .from('orders')
        .update({ special_effects: resolvedName })
        .eq('product_id', p.id);

    if (updateErr) {
        console.error('Update failed:', updateErr);
    } else {
        console.log('Successfully updated orders!');
    }
})();
