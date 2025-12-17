const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.trim();
        }
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debugEffects() {
    console.log('--- 1. Listing All Special Effects Lookups ---');
    const { data: effects, error: err1 } = await supabase.from('special_effects').select('*');
    if (effects) {
        console.table(effects);
    } else {
        console.error(err1);
    }

    console.log('\n--- 2. Searching Products with "141" in special_effects ---');
    // We filter by logical string match
    const { data: products, error: err2 } = await supabase
        .from('products')
        .select('id, sku, product_name, special_effects')
        .or('special_effects.ilike.%141%');

    if (products && products.length > 0) {
        console.log(`Found ${products.length} products.`);
        products.forEach(p => {
            console.log(`SKU: ${p.sku} | Effects: "${p.special_effects}"`);
        });
    } else {
        console.log('No products found containing "141" in special_effects field.');
        if (err2) console.error(err2);
    }
}

debugEffects();
