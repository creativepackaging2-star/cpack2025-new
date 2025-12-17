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
} catch (e) { }

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    console.log('--- Checking Tables ---');
    const candidates = [
        'coating', 'coatings',
        'delivery_addresses',
        'specifications',
        'special_effects',
        'products' // checking if we can see columns here too if needed
    ];

    for (const table of candidates) {
        const { error } = await supabase.from(table).select('id').limit(1);
        console.log(`[${table}]: ${error ? 'NO' : 'YES'}`);
    }

    console.log('\n--- Checking Storage Buckets ---');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.log('Error listing buckets:', bucketError.message);
    } else {
        if (buckets.length === 0) console.log('No buckets found.');
        buckets.forEach(b => console.log(`Bucket: ${b.name} (public: ${b.public})`));
    }
}

probe();
