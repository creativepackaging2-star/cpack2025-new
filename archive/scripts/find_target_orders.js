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
    const targetId = "5d5e982a-bcca-4b0d-a229-6aada97c1b2f"; // LivaDrine 2.5mg inserts
    console.log(`Checking orders for product: ${targetId}`);

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id, 
            order_id,
            product_name, 
            artwork_code, 
            products (
                id,
                product_name,
                artwork_code
            )
        `)
        .eq('product_id', targetId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${orders.length} orders linked to this product.`);
    fs.writeFileSync('target_orders.json', JSON.stringify(orders, null, 2));
    console.log('Written to target_orders.json');
})();
