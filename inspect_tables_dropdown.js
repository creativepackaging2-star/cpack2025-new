
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(table) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
        console.log(`Error checking ${table}:`, error.message);
        return;
    }
    if (data && data.length > 0) {
        console.log(`Table: ${table}`);
        console.log('Columns:', Object.keys(data[0]).join(', '));
    } else {
        console.log(`Table: ${table} is accessible but empty.`);
    }
}

async function run() {
    await checkTable('specifications');
    await checkTable('delivery_addresses');
    await checkTable('gsm');
    await checkTable('category');
}

run();
