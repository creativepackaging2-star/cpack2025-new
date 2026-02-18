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
    console.log('=== CHECKING LOOKUP TABLES ===\n');

    // Check sizes table
    const { data: sizes } = await supabase.from('sizes').select('*').limit(1);
    if (sizes?.[0]) {
        console.log('SIZES table columns:', Object.keys(sizes[0]));
        console.log('Sample:', sizes[0]);
    }

    // Check other lookup tables
    const tables = ['paper_types', 'gsm', 'pasting_types', 'construction_types'];
    for (const table of tables) {
        const { data } = await supabase.from(table).select('*').limit(1);
        if (data?.[0]) {
            console.log(`\n${table.toUpperCase()} columns:`, Object.keys(data[0]));
        }
    }
})();
