const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) {
    console.warn('No .env.local found');
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    // Target: LivaDrine 2.5mg inserts
    const productId = "5d5e982a-bcca-4b0d-a229-6aada97c1b2f";

    // Get product data
    const { data: product } = await supabase
        .from('products')
        .select('artwork_code, product_name')
        .eq('id', productId)
        .single();

    console.log('Product Data:', product);

    // Update linked orders
    const { data: orders, error } = await supabase
        .from('orders')
        .update({
            artwork_code: product.artwork_code,
            product_name: product.product_name
        })
        .eq('product_id', productId)
        .select();

    if (error) {
        console.error('Update Error:', error);
    } else {
        console.log(`Updated ${orders.length} orders.`);
        console.log('New snapshot:', orders[0].artwork_code);
    }

})();
