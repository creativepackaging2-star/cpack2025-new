const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    const p = l.split('=');
    if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data: orders } = await supabase.from('orders').select('id, order_id, specs').ilike('product_name', '%S One Trio%');
    for (const o of orders) {
        const hasFoilRed = (o.specs || '').includes('Foil - Red');
        const hasEmbossing = (o.specs || '').includes('Embossing');
        console.log(`Order ${o.order_id}: FoilRed=${hasFoilRed}, Embossing=${hasEmbossing}, Specs="${o.specs}"`);
    }
})();
