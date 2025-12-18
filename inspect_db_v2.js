
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Orders Table Sample Row ---');
    const { data: order, error: orderError } = await supabase.from('orders').select('*').limit(1).single();
    if (orderError) console.error('Order Error:', orderError);
    else console.log(JSON.stringify(order, null, 2));

    console.log('\n--- Orders Enhanced Sample Row ---');
    const { data: enhanced, error: enhancedError } = await supabase.from('orders_enhanced').select('*').limit(1).single();
    if (enhancedError) console.error('Enhanced Error:', enhancedError.message);
    else console.log(JSON.stringify(enhanced, null, 2));
}

inspect();
