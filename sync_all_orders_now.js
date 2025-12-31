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
    console.log('=== SYNCING ALL ORDERS FROM PRODUCTS ===\n');

    // Get all special effects for lookup
    const { data: effects } = await supabase.from('special_effects').select('*');
    const effectMap = {};
    effects.forEach(e => effectMap[e.id] = e.name);

    // Get all products with orders
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects, specs, dimension, plate_no, ink, ups, artwork_code');

    console.log(`Processing ${products.length} products...\n`);

    let totalUpdated = 0;

    for (const product of products) {
        // Check if product has orders
        const { data: orders } = await supabase
            .from('orders')
            .select('id')
            .eq('product_id', product.id);

        if (!orders || orders.length === 0) continue;

        // Resolve special effects IDs to names
        let specialEffectsNames = '';
        if (product.special_effects) {
            const ids = product.special_effects.split('|').map(s => s.trim());
            const names = ids.map(id => {
                // Check if it's already a name or an ID
                if (/^\d+$/.test(id)) {
                    return effectMap[id] || id;
                }
                return id;
            });
            specialEffectsNames = names.join(' | ');
        }

        // Resolve names in the specs string if they are IDs
        let resolvedSpecs = product.specs || '';
        if (resolvedSpecs) {
            resolvedSpecs = resolvedSpecs.split('|').map(part => {
                const trimmed = part.trim();
                if (/^\d+$/.test(trimmed)) {
                    return effectMap[trimmed] || trimmed;
                }
                return trimmed;
            }).join(' | ');
        }

        // Update orders
        const updateData = {
            product_name: product.product_name,
            specs: resolvedSpecs,
            product_specs: resolvedSpecs,
            special_effects: specialEffectsNames,
            dimension: product.dimension,
            plate_no: product.plate_no,
            ink: product.ink,
            artwork_code: product.artwork_code
        };

        // Handle UPS safely
        if (product.ups && !isNaN(Number(product.ups))) {
            updateData.ups = Number(product.ups);
            updateData.product_ups = Number(product.ups);
        }

        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('product_id', product.id);

        if (error) {
            console.error(`❌ ${product.product_name}: ${error.message}`);
        } else {
            totalUpdated += orders.length;
            if (product.product_name.includes('S One Trio')) {
                console.log(`✅ ${product.product_name}: Updated ${orders.length} orders`);
                console.log(`   special_effects: "${specialEffectsNames}"`);
                console.log(`   specs: "${product.specs?.substring(0, 50)}..."`);
            }
        }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Total orders updated: ${totalUpdated}`);
})();
