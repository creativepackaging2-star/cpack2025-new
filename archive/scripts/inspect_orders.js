
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
    console.error('Missing Environment Functions (could not read .env.local)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Inspecting "orders" table (first 3) ---');
    const { data: orders, error: oError } = await supabase.from('orders').select('*').limit(3);
    if (oError) console.error(oError);
    else {
        orders.forEach(o => {
            console.log(`ID: ${o.id}, Product ID: ${o.product_id}, Job ID: ${o.order_id}`);
            console.log(`Snapshot Check: Customer: "${o.customer_name}", Paper: "${o.paper_type_name}", GSM: "${o.gsm_value}"`);
            console.log('---');
        });
    }

    console.log('\n--- Inspecting "orders_enhanced" table (first 3) ---');
    const { data: enh, error: eError } = await supabase.from('orders_enhanced').select('*').limit(3);
    if (eError) console.error(eError);
    else {
        if (!enh || enh.length === 0) console.log('No data in orders_enhanced');
        else {
            enh.forEach(o => {
                console.log(`ID: ${o.id}, Order ID: ${o.order_id}`);
                console.log('---');
            });
        }
    }
}

check();
