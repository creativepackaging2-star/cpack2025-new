import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProduct() {
    console.log('Searching for BD Poma 4 mg Carton...\n');

    // Find the product
    const { data: product, error: prodError } = await supabase
        .from('products')
        .select('*')
        .ilike('product_name', '%BD Poma 4 mg%')
        .single();

    if (prodError) {
        console.error('Product Error:', prodError);
        return;
    }

    console.log('=== PRODUCT DETAILS ===');
    console.log('Product Name:', product.product_name);
    console.log('GSM ID:', product.gsm_id);
    console.log('Actual GSM Used:', product.actual_gsm_used);
    console.log('Artwork Code:', product.artwork_code);

    // Get GSM name from lookup
    if (product.gsm_id) {
        const { data: gsm } = await supabase
            .from('gsm')
            .select('name')
            .eq('id', product.gsm_id)
            .single();
        console.log('GSM Value (from table):', gsm?.name);
    }

    // Find recent orders for this product
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('order_id, product_name, gsm_value, actual_gsm_used, created_at')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(3);

    if (!orderError && orders && orders.length > 0) {
        console.log('\n=== RECENT ORDERS ===');
        orders.forEach((order, i) => {
            console.log(`\nOrder ${i + 1}:`);
            console.log('  Order ID:', order.order_id);
            console.log('  GSM Value:', order.gsm_value);
            console.log('  Actual GSM Used:', order.actual_gsm_used);
            console.log('  Created:', order.created_at);
        });
    } else {
        console.log('\nNo orders found for this product');
    }
}

checkProduct().then(() => process.exit(0));
