const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
lines.forEach(l => {
    const parts = l.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSync() {
    console.log('Fetching products...');
    const { data: products, error: pError } = await supabase.from('products').select('id, product_name').limit(5);
    if (pError) { console.error('Product fetch failed:', pError); return; }

    for (const p of products) {
        console.log(`Checking orders for: ${p.product_name} (${p.id})`);
        const { data: orders, error: oError } = await supabase.from('orders').select('id').eq('product_id', p.id);
        if (oError) {
            console.error(`Order fetch failed for ${p.product_name}:`, oError);
        } else {
            console.log(`Found ${orders?.length || 0} orders.`);
        }
    }
}

testSync();
