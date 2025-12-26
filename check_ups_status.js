const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
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
    console.log('=== CHECKING UPS STATUS ===\n');

    // Check orders table for product_ups column
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, product_sku, product_ups')
        .limit(5);

    if (ordersError) {
        console.log('Orders error:', ordersError);
    } else {
        console.log('Sample Orders (checking product_ups column):');
        console.table(orders);
    }

    // Check products table for ups and specs
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('sku, ups, specs, print_size')
        .limit(10);

    if (productsError) {
        console.log('\nProducts error:', productsError);
    } else {
        console.log('\nSample Products (checking ups and specs):');
        products.forEach(p => {
            console.log(`\nSKU: ${p.sku}`);
            console.log(`  UPS: ${p.ups}`);
            console.log(`  Print Size: ${p.print_size}`);
            console.log(`  Specs: ${p.specs}`);
        });
    }

    // Check if specs includes UPS value
    if (products && products.length > 0) {
        const hasUpsInSpecs = products.some(p => p.specs && p.specs.includes('UPS'));
        console.log(`\n✓ Does specs column include UPS? ${hasUpsInSpecs ? 'YES' : 'NO'}`);
    }
})();
