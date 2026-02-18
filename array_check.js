const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').filter(line => line.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        if (k && v) env[k.trim()] = v.trim();
    });
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- ARRAY VS OBJECT CHECK ---');

    // UI-style query
    const { data, error } = await supabase
        .from('products')
        .select('id, specifications(name)')
        .limit(1);

    if (error) {
        console.log(`Query failed: ${error.message}`);
    } else {
        const p = data[0];
        console.log('Product ID:', p.id);
        console.log('Type of specifications property:', Array.isArray(p.specifications) ? 'ARRAY' : typeof p.specifications);
        console.log('specifications content:', JSON.stringify(p.specifications, null, 2));
    }
}

check();
