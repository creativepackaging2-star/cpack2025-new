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
    console.log('=== TARGETED FIX: S ONE TRIO SPECS ===\n');

    // 1. Get Lookups
    const { data: effects } = await supabase.from('special_effects').select('*');
    const effectMap = {};
    effects.forEach(e => effectMap[e.id] = e.name);

    const { data: sizes } = await supabase.from('sizes').select('*');
    const sizeMap = {};
    sizes.forEach(s => sizeMap[s.id] = s.name);

    // 2. Get S One Trio Products
    const { data: products } = await supabase.from('products')
        .select('*')
        .ilike('product_name', '%S One Trio%');

    if (!products || products.length === 0) {
        console.log('No products found matching S One Trio');
        return;
    }

    for (const p of products) {
        console.log(`\nUpdating Product: ${p.product_name} (${p.id})`);

        // RE-CALCULATE FROM RAW DATA
        const effectIds = (p.special_effects || '').split('|').map(s => s.trim()).filter(Boolean);
        const resolvedEffects = effectIds.map(id => effectMap[id] || id).join(' | ');
        const sizeName = sizeMap[p.size_id] || '';

        const specsParts = [
            sizeName,
            (p.ups && p.ups > 0) ? `UPS: ${p.ups}` : '',
            p.dimension,
            resolvedEffects
        ].filter(v => v && v.trim() !== '');

        const freshSpecs = specsParts.join(' | ');
        console.log(`Old Specs: "${p.specs}"`);
        console.log(`New Specs: "${freshSpecs}"`);

        // Update Product
        const { error: pError } = await supabase.from('products')
            .update({ specs: freshSpecs })
            .eq('id', p.id);

        if (pError) {
            console.error(`Error updating product: ${pError.message}`);
        } else {
            console.log('✅ Product specs updated.');
        }

        // Sync to Orders
        const { error: oError } = await supabase.from('orders')
            .update({
                specs: freshSpecs,
                product_specs: freshSpecs,
                special_effects: resolvedEffects
            })
            .eq('product_id', p.id);

        if (oError) {
            console.error(`Error syncing orders: ${oError.message}`);
        } else {
            console.log('✅ Linked orders synced.');
        }
    }

    console.log('\n=== COMPLETE ===');
})();
