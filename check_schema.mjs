
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
    console.log('--- Checking Orders Table ---');
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (orderError) console.error('Orders Table Error:', orderError);
    else console.log('Orders Columns:', Object.keys(orderData[0] || {}));

    console.log('\n--- Checking Products Table ---');
    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (productError) console.error('Products Table Error:', productError);
    else console.log('Products Columns:', Object.keys(productData[0] || {}));

    // Try to check for "order_enhanced" or similar
    console.log('\n--- Checking order_enhanced Table ---');
    const { data: enhData, error: enhError } = await supabase
        .from('order_enhanced')
        .select('*')
        .limit(1);

    if (enhError) console.log('order_enhanced Table does not exist or error:', enhError.message);
    else console.log('order_enhanced Columns:', Object.keys(enhData[0] || {}));
}

checkSchema();
