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
    console.log('=== DATABASE CHECK ===\n');

    // Check orders
    const { data: orders } = await supabase.from('orders').select('*').limit(1);
    if (orders?.[0]) {
        console.log('Orders columns:', Object.keys(orders[0]).sort());
    }

    // Check products
    const { data: products } = await supabase.from('products').select('*').limit(1);
    if (products?.[0]) {
        console.log('\nProducts columns:', Object.keys(products[0]).sort());
    }

    // Sample data
    const { data: prodSample } = await supabase
        .from('products')
        .select('sku, ups, print_size, specs')
        .limit(3);

    console.log('\n=== SAMPLE PRODUCTS ===');
    prodSample?.forEach(p => {
        console.log(`\nSKU: ${p.sku}`);
        console.log(`  UPS: ${p.ups}`);
        console.log(`  Size: ${p.print_size}`);
        console.log(`  Specs: ${p.specs}`);
    });
})();
