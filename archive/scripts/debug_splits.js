
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            process.env[key.trim()] = valParts.join('=').trim();
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Environment Functions');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking for Order IDs with "-P" or "SPLIT-" ---');
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_id, product_name, quantity')
        .or('order_id.ilike.%-P%,order_id.ilike.%SPLIT-%');

    if (error) console.error(error);
    else {
        console.log(`Found ${orders.length} matches:`);
        orders.forEach(o => {
            console.log(`[ID: ${o.id}] JobID: ${o.order_id} | Product: ${o.product_name} | Qty: ${o.quantity}`);
        });
    }
}

check();
