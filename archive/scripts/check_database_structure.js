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
    console.log('=== CHECKING DATABASE STRUCTURE ===\n');

    // Check orders table
    const { data: sampleOrder, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (orderError) {
        console.error('Error fetching orders:', orderError);
    } else if (sampleOrder && sampleOrder.length > 0) {
        console.log('ORDERS TABLE COLUMNS:');
        console.log(Object.keys(sampleOrder[0]).sort().join(', '));
        console.log('\n');
    }

    // Check products table
    const { data: sampleProduct, error: productError } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (productError) {
        console.error('Error fetching products:', productError);
    } else if (sampleProduct && sampleProduct.length > 0) {
        console.log('PRODUCTS TABLE COLUMNS:');
        console.log(Object.keys(sampleProduct[0]).sort().join(', '));
        console.log('\n');
    }

    // Check for UPS in both tables
    const { data: ordersWithUps } = await supabase
        .from('orders')
        .select('id, ups')
        .not('ups', 'is', null)
        .limit(5);

    console.log('SAMPLE ORDERS WITH UPS:');
    console.table(ordersWithUps);

    const { data: productsWithUps } = await supabase
        .from('products')
        .select('sku, ups, specs, print_size')
        .limit(5);

    console.log('\nSAMPLE PRODUCTS:');
    console.table(productsWithUps);
})();
