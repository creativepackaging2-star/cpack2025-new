const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    const p = l.split('=');
    if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    console.log('Force Syncing S One Trio...');
    const { data: products } = await supabase.from('products').select('*').ilike('product_name', '%S One Trio%');
    const { data: effects } = await supabase.from('special_effects').select('*');
    const eMap = {};
    effects.forEach(e => eMap[e.id] = e.name);

    for (const p of products) {
        const eIds = (p.special_effects || '').split('|').map(s => s.trim()).filter(Boolean);
        const resEffs = eIds.map(id => eMap[id] || id).join(' | ');
        const freshSpecs = p.specs; // Already fixed in product table usually

        const { data: orders } = await supabase.from('orders').select('id, order_id').eq('product_id', p.id);
        for (const o of orders) {
            console.log(`Syncing ${o.order_id}...`);
            const { error } = await supabase.from('orders').update({
                specs: freshSpecs,
                product_specs: freshSpecs,
                special_effects: resEffs
            }).eq('id', o.id);
            if (error) console.log(`Error: ${error.message}`);
            else console.log('Success');
        }
    }
})();
