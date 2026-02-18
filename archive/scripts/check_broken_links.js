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
    console.log('=== CHECKING FOR MISSING NAMES ===\n');

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            product_id,
            product_sku,
            products (
                product_name
            )
        `)
        .is('products', null)
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${orders.length} orders with missing product links.`);
    orders.forEach(o => {
        console.log(`Order ID: ${o.id} | Product ID: ${o.product_id} | SKU: ${o.product_sku}`);
    });
})();
