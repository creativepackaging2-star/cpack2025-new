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
    console.log('Fixing S One Trio 20 Carton JSON Data...');

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
    console.log(`Current special_effects: ${p.special_effects}`); // Expected: ["4"]

    // 2. Normalize Data
    let raw = p.special_effects;
    let ids = [];

    // Check if JSON
    if (raw.trim().startsWith('[') && raw.trim().endsWith(']')) {
        try {
            // Parse JSON 
            // Handle potentially single quoted JSON (invalid std JSON but common in JS logs) if needed, but assuming valid JSON or array string
            // Actually, if it's '["4"]' (double quotes), JSON.parse works.
            ids = JSON.parse(raw);
            console.log('Parsed JSON:', ids);
            if (Array.isArray(ids)) {
                // Determine clean pipe-separated string
                const cleanValue = ids.map(x => String(x).trim()).join('|');
                console.log(`Clean Value to Save: "${cleanValue}"`);

                // Update Product
                const { error: pUpdateErr } = await supabase
                    .from('products')
                    .update({ special_effects: cleanValue })
                    .eq('id', p.id);

                if (pUpdateErr) console.error('Product update failed:', pUpdateErr);
                else console.log('Product cleaned.');

                ids = cleanValue.split('|'); // For resolver below
            }
        } catch (e) {
            console.error('JSON Parse Error:', e);
            // Fallback: try regex extract
            const matches = raw.match(/"(\d+)"/g);
            if (matches) {
                ids = matches.map(m => m.replace(/"/g, ''));
                console.log('Extracted via Regex:', ids);
            }
        }
    } else {
        ids = raw.split('|');
    }

    // 3. Resolve Names
    const { data: effects } = await supabase.from('special_effects').select('id, name');

    let resolvedName = raw;
    if (effects && ids.length > 0) {
        const names = ids.map(id => {
            const match = effects.find(e => String(e.id) === String(id));
            return match ? match.name : id;
        });
        resolvedName = names.join(' | ');
        console.log(`Resolved Order Value: "${resolvedName}"`);
    }

    // 4. Update Orders
    const { error: updateErr } = await supabase
        .from('orders')
        .update({ special_effects: resolvedName })
        .eq('product_id', p.id);

    if (updateErr) {
        console.error('Order update failed:', updateErr);
    } else {
        console.log('Successfully updated orders!');
    }
})();
