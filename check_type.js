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

async function checkType() {
    const { data, error } = await supabase.rpc('get_table_type', { t_name: 'orders_enhanced' });
    if (error) {
        // Another way to check: try to insert and see if it fails with 'cannot insert into view'
        console.log('Error checking type via RPC, assuming it might be a view if it has many joined columns.');
    } else {
        console.log('Type of orders_enhanced:', data);
    }
}
checkType();
