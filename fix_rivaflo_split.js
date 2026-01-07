
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fixRivaflo() {
    console.log('--- Fixing Rivaflo Splits ---');
    const { data: orders } = await supabase.from('orders').select('id, order_id, product_name, quantity, parent_id').ilike('product_name', '%Rivaflo%');

    // Find the 8000 and 2000
    const o8000 = orders.find(o => o.quantity === 8000);
    const o2000 = orders.find(o => o.quantity === 2000);

    if (o8000 && o2000) {
        console.log(`Found: 8000 (ID: ${o8000.id}) and 2000 (ID: ${o2000.id})`);

        // Check if 8000 has -P and 2000 doesn't
        if (o8000.order_id.endsWith('-P') && !o2000.order_id.endsWith('-P')) {
            console.log('Swapping -P if logical...');
            // Actually, let's just link them.
        }

        // Link them: let's assume 8000 is parent if it's the larger/older one?
        // Actually, if split was 10000 -> 8000 + 2000, 8000 is usually the remainder (parent).
        // But if 8000 has -P, then 2000 might be the parent? Or both are children of a deleted 10000?

        // Let's just set parent_id correctly based on the user's description.
        // User says 8000 shows split but 2000 is separate.
        // I will link 2000 to 8000.
        const { error } = await supabase.from('orders').update({ parent_id: o8000.id }).eq('id', o2000.id);
        if (error) console.error(error);
        else console.log('Linked 2000 to 8000');
    } else {
        console.log('Could not find both 8000 and 2000 orders.');
        console.log('Available quantities:', orders.map(o => o.quantity));
    }
}
fixRivaflo();
