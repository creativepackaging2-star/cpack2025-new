const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
    return env;
}

const env = getEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkColumns() {
    console.log('--- ORDERS COLUMNS ---');
    const { data: cols, error } = await supabase.rpc('get_table_columns', { t_name: 'orders' });
    if (error) {
        // Fallback: try to select one row and get keys
        const { data } = await supabase.from('orders').select('*').limit(1);
        if (data && data[0]) {
            console.log(Object.keys(data[0]).join('\n'));
        } else {
            console.error('Could not get columns for orders');
        }
    } else {
        cols.forEach(c => console.log(c.column_name));
    }

    console.log('\n--- ORDERS_ENHANCED COLUMNS ---');
    const { data: colsE, errorE } = await supabase.rpc('get_table_columns', { t_name: 'orders_enhanced' });
    if (errorE) {
        const { data } = await supabase.from('orders_enhanced').select('*').limit(1);
        if (data && data[0]) {
            console.log(Object.keys(data[0]).join('\n'));
        } else {
            console.error('Could not get columns for orders_enhanced');
        }
    } else {
        colsE.forEach(c => console.log(c.column_name));
    }
}

checkColumns();
