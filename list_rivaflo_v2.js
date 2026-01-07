
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const { data: orders } = await supabase.from('orders').select('id, order_id, product_name, quantity, parent_id').ilike('product_name', '%Rivaflo%');
    for (const o of orders) {
        console.log(`ORDER_ID_${o.id}_DATA: ${o.id} | ${o.order_id} | ${o.product_name} | ${o.quantity} | ${o.parent_id}`);
    }
}
run();
