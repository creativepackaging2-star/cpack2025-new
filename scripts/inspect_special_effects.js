const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) process.env[key.trim()] = val.trim();
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspect() {
    console.log('--- Fetching all special_effects lookup entries ---');
    const { data: effects, error: errEffects } = await supabase.from('special_effects').select('id, name');
    if (errEffects) {
        console.error('Error fetching special_effects:', errEffects);
    } else {
        console.table(effects);
    }

    console.log('\n--- Distinct special_effects values in products ---');
    const { data: distinct, error: errDistinct } = await supabase
        .from('products')
        .select('special_effects', { count: 'exact', head: false })
        .neq('special_effects', null);
    if (errDistinct) {
        console.error('Error fetching distinct values:', errDistinct);
        return;
    }
    const unique = new Set();
    distinct.forEach(p => {
        if (p.special_effects) {
            p.special_effects.split(/[|/]/).forEach(v => unique.add(v.trim()));
        }
    });
    console.log('Unique IDs/Values found in products.special_effects:');
    console.log(Array.from(unique).sort());
}

inspect();
