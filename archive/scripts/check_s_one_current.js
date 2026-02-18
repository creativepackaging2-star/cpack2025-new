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
    console.log('=== CHECKING S ONE TRIO CURRENT STATE ===\n');

    // 1. Get all special effects
    const { data: effects } = await supabase.from('special_effects').select('*').order('id');
    console.log('Available Special Effects:');
    effects.forEach(e => console.log(`  ${e.id}: ${e.name}`));
    console.log('');

    // 2. Find S One Trio products
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .ilike('product_name', '%S One Trio%');

    console.log(`Found ${products.length} S One Trio products:\n`);

    products.forEach(p => {
        console.log(`Product: ${p.product_name}`);
        console.log(`  ID: ${p.id}`);
        console.log(`  special_effects RAW: "${p.special_effects}"`);

        // Check what ID 4 is
        const match = effects.find(e => e.id === 4);
        console.log(`  ID 4 maps to: ${match ? match.name : 'NOT FOUND'}`);
        console.log('');
    });

    // 3. Check if there's a legacy CSV or old data
    console.log('What SHOULD the special effect be for S One Trio?');
    console.log('Please check your original data source or let me know the correct value.');
})();
