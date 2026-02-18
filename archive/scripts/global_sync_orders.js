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
    console.log('=== GLOBAL SYNC: REFRESHING ALL ORDERS FROM PRODUCT DATA ===\n');

    // 1. Get All Special Effects & Sizes for resolution
    const [{ data: effects }, { data: sizes }] = await Promise.all([
        supabase.from('special_effects').select('*'),
        supabase.from('sizes').select('*')
    ]);

    const effectMap = {};
    effects.forEach(e => effectMap[e.id] = e.name);

    const sizeMap = {};
    sizes.forEach(s => sizeMap[s.id] = s.name);

    // 2. Get All Products
    const { data: products } = await supabase.from('products').select('*');
    const productMap = {};
    products.forEach(p => {
        // PRE-CALCULATE FRESH SPECS
        const eIds = (p.special_effects || '').split('|').map(s => s.trim()).filter(Boolean);
        const resolvedEffs = eIds.map(id => effectMap[id] || id).join(' | ');
        const sizeName = sizeMap[p.size_id] || '';

        const specsParts = [
            sizeName,
            (p.ups && p.ups > 0) ? `UPS: ${p.ups}` : '',
            p.dimension,
            resolvedEffs
        ].filter(v => v && v.trim() !== '');

        const freshSpecs = specsParts.join(' | ');

        productMap[p.id] = {
            ...p,
            freshSpecs,
            resolvedEffs
        };

        // Also update product specs in DB if stale
        if (p.specs !== freshSpecs) {
            supabase.from('products').update({ specs: freshSpecs }).eq('id', p.id).then();
        }
    });

    console.log(`Found ${products.length} products. Fetching all orders...`);

    // 3. Get All Orders
    const { data: orders } = await supabase.from('orders').select('id, order_id, product_id, product_name, specs');
    console.log(`Found ${orders.length} orders. Starting sync...`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const o of orders) {
        if (!o.product_id || !productMap[o.product_id]) continue;

        const p = productMap[o.product_id];

        // If the order specs are different from product fresh specs
        if (o.specs !== p.freshSpecs || o.product_name !== p.product_name) {
            const { error } = await supabase.from('orders')
                .update({
                    product_name: p.product_name,
                    specs: p.freshSpecs,
                    product_specs: p.freshSpecs,
                    special_effects: p.resolvedEffs,
                    dimension: p.dimension,
                    plate_no: p.plate_no,
                    ink: p.ink,
                    artwork_code: p.artwork_code,
                    ups: (p.ups && !isNaN(Number(p.ups))) ? Number(p.ups) : null
                })
                .eq('id', o.id);

            if (error) {
                console.log(`❌ Order ${o.order_id} failed: ${error.message}`);
                errorCount++;
            } else {
                updatedCount++;
                if (updatedCount % 50 === 0) console.log(`Synced ${updatedCount} orders...`);
            }
        }
    }

    console.log(`\n=== SYNC COMPLETE ===`);
    console.log(`Total Updated: ${updatedCount}`);
    console.log(`Total Errors: ${errorCount}`);
})();
