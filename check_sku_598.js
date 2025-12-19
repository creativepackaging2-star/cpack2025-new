
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            process.env[key.trim()] = valParts.join('=').trim();
        }
    });
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSKU598() {
    console.log('=== CHECKING SKU 598 ===\n');

    // 1. Find product with SKU 598
    const { data: product } = await supabase.from('products')
        .select('*')
        .eq('sku', 'PRD-598')
        .single();

    if (!product) {
        console.log('Product not found. Trying without PRD- prefix...');
        const { data: p2 } = await supabase.from('products').select('*').eq('sku', '598').single();
        if (p2) {
            console.log('Found with SKU "598"');
            console.log('Product ID:', p2.id);
            console.log('Name:', p2.product_name);
            console.log('Customer ID:', p2.customer_id);
            console.log('Paper Type ID:', p2.paper_type_id);
            console.log('GSM ID:', p2.gsm_id);
            console.log('Dimension:', p2.dimension);
            console.log('Ink:', p2.ink);
            console.log('Coating:', p2.coating);
        }
        return;
    }

    console.log('PRODUCT DATA:');
    console.log('ID:', product.id);
    console.log('Name:', product.product_name);
    console.log('Customer ID:', product.customer_id);
    console.log('Paper Type ID:', product.paper_type_id);
    console.log('GSM ID:', product.gsm_id);
    console.log('Dimension:', product.dimension);
    console.log('Ink:', product.ink);
    console.log('Coating:', product.coating);

    // 2. Find orders for this product
    console.log('\n=== ORDERS FOR THIS PRODUCT ===');
    const { data: orders } = await supabase.from('orders')
        .select('id, order_id, customer_name, paper_type_name, gsm_value, dimension, ink, coating')
        .eq('product_id', product.id);

    console.log(`Found ${orders.length} orders`);
    orders.forEach(o => {
        console.log(`\nOrder ${o.order_id}:`);
        console.log('  Customer:', o.customer_name || 'NULL');
        console.log('  Paper:', o.paper_type_name || 'NULL');
        console.log('  GSM:', o.gsm_value || 'NULL');
        console.log('  Dimension:', o.dimension || 'NULL');
        console.log('  Ink:', o.ink || 'NULL');
        console.log('  Coating:', o.coating || 'NULL');
    });
}

checkSKU598();
