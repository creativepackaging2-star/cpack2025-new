
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data } = await supabase.from('orders').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('COLUMNS:', Object.keys(data[0]).join(','));
    }
}
run();
