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
    console.log('=== FORCING ORDER SYNC BY INDIVIDUAL ID ===\n');

    // 1. Get S One Trio products with their FRESH specs
    const { data: products } = await supabase.from('products')
        .select('id, product_name, specs, special_effects, dimension, plate_no, ink, artwork_code, ups')
        .ilike('product_name', '%S One Trio%');

    for (const p of products) {
        console.log(`Processing Product: ${p.product_name}`);

        // 2. Resolve effect names for snapshots
        const { data: effects } = await supabase.from('special_effects').select('*');
        const effectMap = {};
        effects.forEach(e => effectMap[e.id] = e.name);

        const effectIds = (p.special_effects || '').split('|').map(s => s.trim()).filter(Boolean);
        const resolvedEffects = effectIds.map(id => effectMap[id] || id).join(' | ');

        // 3. Find and Update each order individually
        const { data: orders } = await supabase.from('orders')
            .select('id, order_id')
            .eq('product_id', p.id);

        console.log(`Found ${orders?.length || 0} orders to sync.`);

        for (const o of orders) {
            process.stdout.write(`  Syncing Order ${o.order_id}... `);
            const { error } = await supabase.from('orders')
                .update({
                    specs: p.specs,
                    product_specs: p.specs,
                    special_effects: resolvedEffects,
                    dimension: p.dimension,
                    plate_no: p.plate_no,
                    ink: p.ink,
                    artwork_code: p.artwork_code,
                    ups: (p.ups && !isNaN(Number(p.ups))) ? Number(p.ups) : null
                })
                .eq('id', o.id);

            if (error) {
                console.log(`❌ FAILED: ${error.message}`);
                // If it fails with schema cache, try one more time after a delay
                if (error.message.includes('schema cache')) {
                    await new Promise(r => setTimeout(r, 1000));
                    const { error: retryError } = await supabase.from('orders').update({ specs: p.specs }).eq('id', o.id);
                    if (retryError) console.log(`Retry failed: ${retryError.message}`);
                    else console.log('✅ FIXED on retry.');
                }
            } else {
                console.log('✅ DONE');
            }
        }
    }
    console.log('\n=== SYNC COMPLETE ===');
})();
