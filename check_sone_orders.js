const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    const p = l.split('=');
    if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data: orders } = await supabase.from('orders').select('*').ilike('product_name', '%S One Trio%');
    console.log('--- S ONE TRIO ORDERS ---');
    orders.forEach(o => {
        console.log(`Order ID: ${o.id}, Job ID: ${o.order_id}`);
        console.log(`Specs Column: "${o.specs}"`);
        console.log(`Product Name: "${o.product_name}"`);
        console.log('---');
    });
})();
