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
    console.log('=== DEBUGGING ORDER DATA ===\n');

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            order_id,
            product_id,
            product_sku,
            products (
                product_name
            )
        `)
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Sample Data:');
    orders.forEach(o => {
        console.log(`Order ID: ${o.id} | Job ID: ${o.order_id} | Product ID: ${o.product_id} | Name: ${o.products?.product_name || 'NULL'}`);
    });
})();
