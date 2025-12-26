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
    console.log('=== CHECKING ALL LOOKUP TABLES ===\n');

    const tables = ['pasting_types', 'construction_types'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`${table}: ERROR -`, error.message);
        } else if (data?.[0]) {
            console.log(`${table}:`, Object.keys(data[0]));
            console.log('  Sample:', data[0]);
        }
        console.log('');
    }
})();
