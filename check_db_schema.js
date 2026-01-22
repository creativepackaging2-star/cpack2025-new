
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-client');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    const tables = ['products', 'orders', 'customers', 'category', 'quotations'];
    const results = {};

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        results[table] = {
            exists: !error,
            count: data ? data.length : 0,
            columns: data && data[0] ? Object.keys(data[0]) : [],
            error: error ? error.message : null
        };
    }

    console.log(JSON.stringify(results, null, 2));
}

checkSchema();
