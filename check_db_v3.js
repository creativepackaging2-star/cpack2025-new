
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const { data } = await s.from('orders').select('id, batch_no').order('id', { ascending: false }).limit(5);
    data.forEach(d => console.log('ID: ' + d.id + ' | BATCH: [' + d.batch_no + ']'));
}
run();
