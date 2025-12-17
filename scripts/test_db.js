require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars:', { supabaseUrl, supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('Testing connection to:', supabaseUrl);

    // Try lowercase 'products' first, then 'Products'
    const tables = ['products', 'Products'];

    for (const table of tables) {
        console.log(`Fetching from table: "${table}"...`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error on "${table}":`, JSON.stringify(error, null, 2));
        } else {
            console.log(`Success on "${table}":`, data);
            return;
        }
    }
}

testFetch();
