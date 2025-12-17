const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envVars = {};

try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            envVars[key.trim()] = valParts.join('=').trim();
        }
    });
} catch (e) {
    console.error('Failed to read .env.local', e);
}

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const candidates = ['categories', 'Categories', 'category', 'Category', 'master_category', 'Master_Category'];

    for (const table of candidates) {
        console.log(`Checking table: ${table}...`);
        const { data, error } = await supabase.from(table).select('*').limit(3);
        if (!error) {
            console.log(`FOUND "${table}":`, data);
            return; // Found it
        } else {
            console.log(`Not "${table}"`);
        }
    }
    console.log('Could not guess category table name.');
}

checkTables();
