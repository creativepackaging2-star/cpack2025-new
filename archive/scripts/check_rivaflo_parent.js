
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const { data: o8000 } = await supabase.from('orders').select('id, product_name, quantity, delivery_date, batch_no').eq('quantity', 8000).ilike('product_name', '%Rivaflo%');
    console.log('--- 8000 Order ---');
    console.log(JSON.stringify(o8000, null, 2));
}
run();
