
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('.env.local not found');
        process.exit(1);
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
            env[parts[0].trim()] = parts[1].trim();
        }
    });
    return env;
}

const env = getEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const results = {};
    const { data: order } = await supabase.from('orders').select('*').limit(1).single();
    results.orders = order;

    const { data: enhanced } = await supabase.from('orders_enhanced').select('*').limit(1).single();
    results.orders_enhanced = enhanced;

    fs.writeFileSync('db_schema_v2.json', JSON.stringify(results, null, 2), 'utf8');
}

inspect();
