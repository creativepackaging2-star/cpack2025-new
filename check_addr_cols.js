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
    console.log('=== CHECKING DELIVERY_ADDRESSES COLUMNS ===\n');

    const { data, error } = await supabase.from('delivery_addresses').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data[0]) {
        console.log('Columns:', Object.keys(data[0]).sort().join(', '));
        console.log('Sample Row:', data[0]);
    } else {
        console.log('Table is empty.');
    }
})();
