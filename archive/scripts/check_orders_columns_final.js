const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== CHECKING ACTUAL ORDERS COLUMNS ===\n');

    const { data, error } = await supabase.from('orders').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data[0]) {
        const columns = Object.keys(data[0]);
        console.log('Columns in orders table:');
        console.log(columns.sort().join('\n'));
    }
})();
