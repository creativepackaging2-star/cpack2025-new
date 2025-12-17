const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

// Supabase JS client doesn't have a direct 'list tables' method for client keys comfortably
// without hitting 'information_schema'. Let's try to query information_schema if enabled,
// or just brute force more common naming conventions.

async function listTables() {
    console.log('--- Brute Force Check ---');
    // Try construction/paper variants
    const variants = [
        'Construction', 'construction', 'Constructions', 'constructions',
        'PaperType', 'Paper_Type', 'paper_type', 'PaperTypes', 'paper_types', 'Paper', 'paper', 'Papers', 'papers',
        'Material', 'material', 'Materials', 'materials'
    ];

    for (const table of variants) {
        process.stdout.write(`Checking ${table}... `);
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) {
            console.log('FOUND!');
        } else {
            console.log('no');
        }
    }
}
listTables();
