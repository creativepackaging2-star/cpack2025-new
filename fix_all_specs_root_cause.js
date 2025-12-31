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
    console.log('=== FIXING DATABASE SPECS AND SYNCING ALL ORDERS ===\n');

    // 1. Get Lookups
    const { data: effects } = await supabase.from('special_effects').select('*');
    const effectMap = {};
    effects.forEach(e => effectMap[e.id] = e.name);

    const { data: sizes } = await supabase.from('sizes').select('*');
    const sizeMap = {};
    sizes.forEach(s => sizeMap[s.id] = s.name);

    // 2. Get All Products
    const { data: products } = await supabase.from('products')
        .select('*');

    console.log(`Processing ${products.length} products...`);

    let productsFixed = 0;
    let ordersUpdated = 0;

    for (const p of products) {
        // Resolve Special Effects
        const effectIds = (p.special_effects || '').split('|').map(s => s.trim()).filter(Boolean);
        const resolvedEffects = effectIds.map(id => effectMap[id] || id).join(' | ');

        // Construct Correct Specs
        const sizeName = sizeMap[p.size_id] || '';
        const specsParts = [
            sizeName,
            (p.ups && p.ups > 0) ? `UPS: ${p.ups}` : '',
            p.dimension,
            resolvedEffects
        ].filter(v => v && v.trim() !== '');

        const newSpecs = specsParts.join(' | ');

        // Update Product if specs changed
        if (p.specs !== newSpecs) {
            const { error: pError } = await supabase.from('products')
                .update({ specs: newSpecs })
                .eq('id', p.id);

            if (pError) console.error(`Error updating product ${p.product_name}:`, pError.message);
            else productsFixed++;
        }

        // 3. Sync to ALL linked orders
        // We sync using the NEW resolved names and specs
        const { data: linkedOrders } = await supabase.from('orders')
            .select('id')
            .eq('product_id', p.id);

        if (linkedOrders && linkedOrders.length > 0) {
            const { error: oError } = await supabase.from('orders')
                .update({
                    product_name: p.product_name,
                    specs: newSpecs,
                    product_specs: newSpecs,
                    special_effects: resolvedEffects,
                    dimension: p.dimension,
                    plate_no: p.plate_no,
                    ink: p.ink,
                    artwork_code: p.artwork_code,
                    ups: (p.ups && !isNaN(Number(p.ups))) ? Number(p.ups) : null,
                    product_ups: (p.ups && !isNaN(Number(p.ups))) ? Number(p.ups) : null
                })
                .eq('product_id', p.id);

            if (oError) {
                console.error(`Error syncing orders for ${p.product_name}:`, oError.message);
            } else {
                ordersUpdated += linkedOrders.length;
                if (p.product_name.includes('S One Trio')) {
                    console.log(`✅ SYNCED: ${p.product_name}`);
                    console.log(`   New Specs: "${newSpecs}"`);
                }
            }
        }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Products specs fixed: ${productsFixed}`);
    console.log(`Total orders synced: ${ordersUpdated}`);
})();
