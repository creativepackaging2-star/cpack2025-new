const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== CHECKING CURRENT SPECS ===\n');

    const { data: products } = await supabase
        .from('products')
        .select('sku, category_id, size_id, ups, dimension, special_effects, specs')
        .limit(10);

    console.log('Current product specs:');
    products?.forEach(p => {
        console.log(`\nSKU: ${p.sku} (category: ${p.category_id})`);
        console.log(`  Specs: ${p.specs}`);
    });
})();
