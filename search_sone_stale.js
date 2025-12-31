const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    const p = l.split('=');
    if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data: orders } = await supabase.from('orders').select('id, order_id, product_name, specs').ilike('product_name', '%S One%');
    console.log(`Found ${orders?.length || 0} orders with "S One" in name.`);
    orders.forEach(o => {
        if ((o.specs || '').includes('Foil - Red')) {
            console.log(`STALE: Job ${o.order_id} (${o.product_name}): "${o.specs}"`);
        }
    });
})();
