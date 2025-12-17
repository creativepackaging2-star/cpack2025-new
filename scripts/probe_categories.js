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

async function probe() {
    // List of candidates to try
    const candidates = [
        'categories',
        'Categories',
        'category',
        'Category',
        '"Categories"', // Quoted identifier check (Supabase doesn't support this via JS client directly easily, but good to keep in mind)
        'master_category'
    ];

    console.log('--- Probing Category Table ---');

    for (const table of candidates) {
        process.stdout.write(`Testing "${table}" ... `);
        const { data, error } = await supabase.from(table).select('id, name').limit(1);

        if (error) {
            console.log(`FAILED (${error.code || error.message})`);
        } else {
            console.log(`SUCCESS! Found ${data.length} rows.`);
            if (data.length > 0) {
                console.log('Sample:', data[0]);
            }
            console.log(`\n>>> CORRECT TABLE NAME IS: "${table}" <<<\n`);
            return;
        }
    }
    console.log('--- Probe Finished (No Match Found) ---');
}

probe();
