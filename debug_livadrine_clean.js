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
    // 1. Find text in Orders
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id, 
            product_name, 
            artwork_code, 
            product_id,
            products (
                id,
                product_name,
                artwork_code
            )
        `)
        .ilike('product_name', '%LivaDrine%')
        .limit(1); // JUST ONE

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (orders.length === 0) {
        console.log('No orders found.');
        return;
    }

    const o = orders[0];
    const output = JSON.stringify({
        order_id: o.id,
        snapshot_code: o.artwork_code,
        linked_product_code: o.products ? o.products.artwork_code : 'NULL_RELATION',
        linked_product_id: o.products ? o.products.id : 'NULL'
    }, null, 2);

    fs.writeFileSync('debug_output_clean.txt', output);
    console.log('Written to debug_output_clean.txt');
})();
