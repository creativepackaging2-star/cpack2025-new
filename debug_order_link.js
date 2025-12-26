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
    console.log('=== INVESTIGATING ORDER-PRODUCT LINK ===\n');

    // Check orders sample
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, product_id, product_sku, ups, specs')
        .limit(5);

    if (ordersError) {
        console.error('Orders error:', ordersError);
        return;
    }

    console.log('Sample Orders:');
    console.table(orders);

    const productIds = orders.map(o => o.product_id).filter(id => id !== null);
    const productSkus = orders.map(o => o.product_sku).filter(sku => sku !== null);

    if (productIds.length > 0) {
        const { data: productsById } = await supabase
            .from('products')
            .select('id, sku, ups, specs')
            .in('id', productIds);

        console.log('\nProducts found by ID match:');
        console.table(productsById);
    } else {
        console.log('\nNo product_id found in sample orders.');
    }

    if (productSkus.length > 0) {
        const { data: productsBySku } = await supabase
            .from('products')
            .select('id, sku, ups, specs')
            .in('sku', productSkus);

        console.log('\nProducts found by SKU match:');
        console.table(productsBySku);
    }

    // Check if there are any orders where product_id is null but product_sku matches a product
    const { count: nullIdWithSkuMatch } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .is('product_id', null)
        .not('product_sku', 'is', null);

    console.log(`\nOrders with null product_id but having product_sku: ${nullIdWithSkuMatch}`);

})();
