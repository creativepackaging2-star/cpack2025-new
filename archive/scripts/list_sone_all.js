const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    const p = l.split('=');
    if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data } = await supabase.from('products').select('id, product_name, specs').ilike('product_name', '%S One Trio%');
    console.log('PRODUCTS FOUND:', data.length);
    data.forEach(p => console.log(`- ${p.product_name} [${p.id}]: "${p.specs}"`));
    const { data: orders } = await supabase.from('orders').select('id, order_id, product_name, specs').ilike('product_name', '%S One Trio%');
    console.log('\nORDERS FOUND:', orders.length);
    orders.forEach(o => console.log(`- ${o.order_id} [${o.id}]: "${o.specs}"`));
})();
