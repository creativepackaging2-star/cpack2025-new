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
    console.log('=== FIXING ALL JSON-FORMATTED SPECIAL EFFECTS ===\n');

    // 1. Get all products with special_effects
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .not('special_effects', 'is', null);

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }

    console.log(`Found ${products.length} products with special_effects.\n`);

    // 2. Get all special effects for lookup
    const { data: effects } = await supabase.from('special_effects').select('id, name');
    const effectMap = {};
    effects.forEach(e => effectMap[e.id] = e.name);

    let fixedProducts = 0;
    let fixedOrders = 0;

    for (const p of products) {
        let raw = p.special_effects;
        let needsFix = false;
        let ids = [];

        // Check if it's JSON format (starts with [ and ends with ])
        if (raw.trim().startsWith('[') && raw.trim().endsWith(']')) {
            needsFix = true;
            try {
                ids = JSON.parse(raw);
                if (Array.isArray(ids)) {
                    // Convert to pipe-separated format
                    const cleanValue = ids.map(x => String(x).trim()).join('|');

                    console.log(`Product: ${p.product_name}`);
                    console.log(`  Old: ${raw}`);
                    console.log(`  New: ${cleanValue}`);

                    // Update Product
                    const { error: pUpdateErr } = await supabase
                        .from('products')
                        .update({ special_effects: cleanValue })
                        .eq('id', p.id);

                    if (pUpdateErr) {
                        console.error(`  ❌ Product update failed:`, pUpdateErr.message);
                    } else {
                        console.log(`  ✓ Product cleaned`);
                        fixedProducts++;
                    }

                    // Resolve names for orders
                    const names = ids.map(id => {
                        const match = effectMap[String(id)];
                        return match || id;
                    });
                    const resolvedName = names.join(' | ');

                    // Update Orders
                    const { error: oUpdateErr } = await supabase
                        .from('orders')
                        .update({ special_effects: resolvedName })
                        .eq('product_id', p.id);

                    if (oUpdateErr) {
                        console.error(`  ❌ Order update failed:`, oUpdateErr.message);
                    } else {
                        const { count } = await supabase
                            .from('orders')
                            .select('*', { count: 'exact', head: true })
                            .eq('product_id', p.id);
                        console.log(`  ✓ Updated ${count || 0} orders with: "${resolvedName}"`);
                        fixedOrders += (count || 0);
                    }
                    console.log('');
                }
            } catch (e) {
                console.error(`  ❌ JSON Parse Error for ${p.product_name}:`, e.message);
            }
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Products fixed: ${fixedProducts}`);
    console.log(`Orders updated: ${fixedOrders}`);
})();
