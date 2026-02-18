
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function applyMigration() {
    const sql = fs.readFileSync('update_quotations_v2.sql', 'utf8');
    console.log('Applying migration...');

    // Splitting by semicolon and running parts might be safer if exec_sql handles one statement
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
        console.error('Migration failed:', error);
        console.log('\n--- MANUAL ACTION REQUIRED ---');
        console.log('Please run the following SQL in your Supabase Dashboard SQL Editor:');
        console.log(sql);
    } else {
        console.log('Migration applied successfully.');
    }
}

applyMigration();
