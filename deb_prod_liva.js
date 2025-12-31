const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) {
    console.warn('No .env.local found');
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    // Search Products
    const { data: products, error } = await supabase
        .from('products')
        .select(`id, product_name, artwork_code, sku`)
        .ilike('product_name', '%LivaDrine%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${products.length} products with "LivaDrine".`);
    fs.writeFileSync('liva_prods.json', JSON.stringify(products, null, 2));
    console.log('Written to liva_prods.json');
})();
