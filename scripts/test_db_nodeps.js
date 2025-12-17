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
