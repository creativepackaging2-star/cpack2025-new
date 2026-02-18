
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns_v2', { t_name: 'orders' });
    if (error) {
        // RPC might not exist, try another way
        const { data: cols, error: e2 } = await supabase.from('orders').select('*').limit(0);
        console.log('Columns:', Object.keys(cols?.[0] || {}));
    } else {
        console.log('Schema:', data);
    }
}

checkSchema();
