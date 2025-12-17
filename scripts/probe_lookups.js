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

async function probeTables() {
    // Candidates based on ID fields:
    // customer_id -> Customer, Customers, customer, customers
    // paper_type_id -> PaperType, Paper_Type, paper_type, ...
    // gsm_id -> Gsm, gsm, GSM
    // size_id -> Size, size, Sizes, sizes
    // construction_id -> Construction, construction
    // pasting_id -> Pasting, pasting

    const concepts = {
        customer: ['customer', 'Customer', 'customers', 'Customers'],
        paper_type: ['paper_type', 'Paper_Type', 'papertype', 'PaperType', 'paper_types'],
        gsm: ['gsm', 'GSM', 'Gsm'],
        size: ['size', 'Size', 'sizes', 'Sizes', 'paper_sizes'],
        construction: ['construction', 'Construction'],
        pasting: ['pasting', 'Pasting']
    };

    console.log('--- Probing Lookup Tables ---');

    for (const [concept, candidates] of Object.entries(concepts)) {
        let found = false;
        for (const table of candidates) {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (!error) {
                console.log(`[${concept.toUpperCase()}] Found table: "${table}"`);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log(`[${concept.toUpperCase()}] NOT FOUND (tried ${candidates.join(', ')})`);
        }
    }
}

probeTables();
