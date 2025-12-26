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
    console.log('=== CHECKING ORDER FIELDS ===\n');

    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (order?.[0]) {
        console.log('Order columns:', Object.keys(order[0]).sort());
        console.log('\nSample order:');
        console.log(order[0]);
    } else {
        console.log('No orders found.');
    }
})();
