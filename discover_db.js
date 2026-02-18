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

async function listAll() {
    console.log('--- TABLE DISCOVERY ---');

    // Attempt 1: get_tables RPC (might not exist)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_tables');
    if (!rpcErr) {
        console.log('Tables from RPC:', rpcData);
    } else {
        console.log('RPC get_tables not available.');
    }

    // Attempt 2: Try to guess common names
    const suspects = [
        'orders', 'products', 'specifications', 'order_details',
        'orders_enhanced', 'enhanced_orders', 'job_cards', 'production_board',
        'pasting', 'constructions', 'gsm', 'paper_types', 'sizes', 'categories'
    ];

    for (const s of suspects) {
        const { error } = await supabase.from(s).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`- Table/View exists: [${s}]`);
        }
    }

    // Attempt 3: Search for Rasiklal in ANY confirmed table
    console.log('\n--- SEARCHING FOR "RASIKLAL" IN KNOWN TABLES ---');
    const confirmed = ['orders', 'products', 'order_details'];
    for (const table of confirmed) {
        const { data, error } = await supabase.from(table).select('*').ilike('product_name', '%Rasiklal%').limit(2);
        if (!error && data && data.length > 0) {
            console.log(`\nFound in [${table}]:`);
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

listAll();
