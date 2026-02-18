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
    console.log('Searching for "LivaDrine"...');

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
        .ilike('product_name', '%LivaDrine%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${orders.length} orders.`);
    orders.forEach(o => {
        console.log(`\nOrder ID: ${o.id}`);
        console.log(`Order Snapshot Name:  "${o.product_name}"`);
        console.log(`Order Snapshot Code:  "${o.artwork_code}"`);
        if (o.products) {
            console.log(`LINKED Product Name:  "${o.products.product_name}"`);
            console.log(`LINKED Product Code:  "${o.products.artwork_code}"`);
            console.log(`LINKED Product ID:    "${o.products.id}"`);
        } else {
            console.log(`LINKED Product:       NULL (fk issue?)`);
        }
        console.log(`Order product_id FK:  "${o.product_id}"`);
    });

})();
