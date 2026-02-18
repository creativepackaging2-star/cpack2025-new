
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'orders' });
    if (error) {
        // Fallback: try to insert a dummy record and check error or use a different method
        console.log('RPC get_table_columns failed, trying alternative...');
        const { data: cols, error: colErr } = await supabase.from('orders').select('*').limit(0);
        if (colErr) {
            console.error('Error:', colErr);
        } else {
            console.log('Columns fetched via select * (limit 0)');
        }
    } else {
        console.log('Table Columns:', JSON.stringify(data, null, 2));
    }
}

// Alternative way to get column types if RPC is not available
async function checkTypes() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (data && data.length > 0) {
        const row = data[0];
        const types = {};
        for (const key in row) {
            types[key] = typeof row[key];
        }
        console.log('Sample Row Types:', JSON.stringify(types, null, 2));
    }
}

checkSchema().then(() => checkTypes());
