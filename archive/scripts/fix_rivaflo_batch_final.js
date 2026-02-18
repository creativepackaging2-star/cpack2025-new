
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fixBatchFinal() {
    console.log('--- Setting Batch No for Rivaflo 2000 to "RIVAFL070126C" ---');
    const { data: child, error } = await supabase.from('orders').update({ batch_no: 'RIVAFL070126C' }).eq('id', 1476).select();

    if (error) console.error(error);
    else console.log('Updated Child Order:', child[0].id, 'Batch:', child[0].batch_no);
}
fixBatchFinal();
