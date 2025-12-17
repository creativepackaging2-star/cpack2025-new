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

async function probe() {
    // Concepts to find
    const targets = {
        'customer': ['customer', 'Customer', 'customers', 'Customers'],
        'paper_type': ['paper_type', 'Paper_Type', 'papertype', 'PaperType', 'paper', 'Paper'],
        'gsm': ['gsm', 'GSM', 'Gsm'],
        'size': ['size', 'Size', 'sizes', 'Sizes', 'paper_size', 'Paper_Size'],
        'construction': ['construction', 'Construction'],
        'pasting': ['pasting', 'Pasting']
    };

    console.log('--- Probing Tables ---');

    for (const [key, candidates] of Object.entries(targets)) {
        let found = false;
        for (const table of candidates) {
            const { data, error } = await supabase.from(table).select('id').limit(1);
            if (!error) {
                console.log(`${key.toUpperCase()}: "${table}"`);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log(`${key.toUpperCase()}: NOT FOUND`);
        }
    }
}

probe();
