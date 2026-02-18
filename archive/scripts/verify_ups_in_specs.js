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
    console.log('=== VERIFICATION: UPS IN SPECS ===\n');

    // Check products
    const { data: products } = await supabase
        .from('products')
        .select('sku, ups, specs')
        .not('ups', 'is', null)
        .limit(10);

    console.log('Products with UPS values:');
    console.log('─'.repeat(80));
    products?.forEach(p => {
        const hasUpsInSpecs = p.specs?.includes('UPS');
        const status = hasUpsInSpecs ? '✅' : '❌';
        console.log(`${status} SKU: ${p.sku}`);
        console.log(`   UPS: ${p.ups}`);
        console.log(`   Specs: ${p.specs || '(empty)'}`);
        console.log('');
    });

    // Check orders
    const { data: orders } = await supabase
        .from('orders')
        .select('id, product_id, ups, product_ups, specs')
        .not('product_id', 'is', null)
        .limit(5);

    console.log('\n=== ORDERS WITH PRODUCT DATA ===');
    console.log('─'.repeat(80));
    console.table(orders);

    // Summary
    const productsWithUpsInSpecs = products?.filter(p => p.specs?.includes('UPS')).length || 0;
    const totalProducts = products?.length || 0;

    console.log('\n=== SUMMARY ===');
    console.log(`Products with UPS in specs: ${productsWithUpsInSpecs}/${totalProducts}`);

    if (productsWithUpsInSpecs === totalProducts && totalProducts > 0) {
        console.log('✅ SUCCESS: All products have UPS in their specs!');
    } else if (productsWithUpsInSpecs > 0) {
        console.log('⚠️  PARTIAL: Some products have UPS in specs');
    } else {
        console.log('❌ ISSUE: No products have UPS in specs yet');
        console.log('   You may need to run the SQL update script');
    }
})();
