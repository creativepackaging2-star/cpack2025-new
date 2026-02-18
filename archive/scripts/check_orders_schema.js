
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderTable() {
    // Get table info
    const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'orders' });

    if (error) {
        // Fallback if RPC doesn't exist
        const { data: sample, error: sErr } = await supabase.from('orders').select('*').limit(1);
        if (sErr) {
            console.error('Error fetching orders:', sErr);
            return;
        }
        console.log('Order columns (from sample):', Object.keys(sample[0] || {}));
    } else {
        console.log('Order columns:', cols);
    }

    // Check for any RLS or constraints if possible (though limited through JS)
}

checkOrderTable();
