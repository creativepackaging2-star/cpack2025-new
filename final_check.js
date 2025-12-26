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
    console.log('=== FINAL DATA CHECK ===\n');

    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, product_name, ups, specs')
        .not('product_name', 'is', null)
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (orders.length === 0) {
        console.log('No orders found with product_name populated yet.');
    } else {
        console.table(orders);
    }
})();
