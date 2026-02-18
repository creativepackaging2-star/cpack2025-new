const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== VERIFYING COMPREHENSIVE BACKFILL ===\n');

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id, 
            product_name, 
            customer_name, 
            paper_type_name, 
            gsm_value, 
            print_size, 
            delivery_address,
            plate_no,
            ink
        `)
        .not('customer_name', 'is', null)
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log('No updated orders found. Check if the backfill ran correctly.');
    } else {
        console.table(orders);
    }
})();
