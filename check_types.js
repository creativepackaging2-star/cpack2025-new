
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
    const { data, error } = await supabase.rpc('get_table_column_types', { t_name: 'orders' });
    if (error) {
        // Fallback: try to select and check typeof
        const { data: orders } = await supabase.from('orders').select('*').limit(1);
        if (orders && orders[0]) {
            console.log('Sample types:');
            for (const k in orders[0]) {
                console.log(`${k}: ${typeof orders[0][k]}`);
            }
        }
    } else {
        console.log('Types:', data);
    }
}

checkTypes();
