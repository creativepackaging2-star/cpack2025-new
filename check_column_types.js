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
    console.log('=== CHECKING COLUMN TYPES ===\n');

    // We can use a trick to check types by selecting from information_schema
    // In Supabase, we might not have direct access to information_schema via RPC, 
    // but we can try a simple query or check the data itself.

    const { data: ordersData } = await supabase.from('orders').select('*').limit(1);
    const { data: productsData } = await supabase.from('products').select('*').limit(1);

    if (ordersData && ordersData[0]) {
        console.log('Orders Columns:');
        for (const [key, value] of Object.entries(ordersData[0])) {
            if (['id', 'product_id', 'ups', 'product_ups', 'specs', 'product_specs'].includes(key)) {
                console.log(`- ${key}: ${typeof value} (${value})`);
            }
        }
    }

    if (productsData && productsData[0]) {
        console.log('\nProducts Columns:');
        for (const [key, value] of Object.entries(productsData[0])) {
            if (['id', 'sku', 'ups', 'specs'].includes(key)) {
                console.log(`- ${key}: ${typeof value} (${value})`);
            }
        }
    }
})();
