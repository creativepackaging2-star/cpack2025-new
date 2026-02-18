
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verify() {
    console.log('=== DATABASE VERIFICATION ===\n');

    // 1. Check snapshot data
    console.log('1. Checking if snapshot data was filled:');
    const { data: orders } = await supabase.from('orders')
        .select('id, order_id, customer_name, paper_type_name, gsm_value, status')
        .limit(5);

    orders.forEach(o => {
        console.log(`Order ${o.order_id}: Customer="${o.customer_name}", Paper="${o.paper_type_name}", GSM="${o.gsm_value}", Status="${o.status}"`);
    });

    // 2. Check status values
    console.log('\n2. Checking unique status values in database:');
    const { data: allOrders } = await supabase.from('orders').select('status');
    const statuses = [...new Set(allOrders.map(o => o.status))];
    console.log('Unique statuses:', statuses);

    // 3. Test marking one as complete
    console.log('\n3. Testing Complete button (will update order ID 833):');
    const testId = 833;
    const { error } = await supabase.from('orders')
        .update({ status: 'Complete', progress: 'Ready' })
        .eq('id', testId);

    if (error) {
        console.log('ERROR:', error);
    } else {
        console.log('SUCCESS - Now checking if it saved...');
        const { data: check } = await supabase.from('orders').select('status, progress').eq('id', testId).single();
        console.log(`Result: status="${check.status}", progress="${check.progress}"`);
    }
}

verify();
