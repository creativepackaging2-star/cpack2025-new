
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

async function diagnose() {
    const productId = '027fe383-a59a-40b6-83b2-14033b4b9d57';

    // Get lookup data
    const { data: customer } = await supabase.from('customers').select('name').eq('id', 4).single();
    const { data: paper } = await supabase.from('paper_types').select('name').eq('id', 4).single();
    const { data: gsm } = await supabase.from('gsm').select('name').eq('id', 4).single();

    console.log('EXPECTED VALUES FROM PRODUCT:');
    console.log('Customer:', customer?.name);
    console.log('Paper:', paper?.name);
    console.log('GSM:', gsm?.name);
    console.log('Dimension: 140 x 300');
    console.log('Ink: BLACK');

    console.log('\n=== ORDERS FOR SKU 598 ===');
    const { data: orders } = await supabase.from('orders')
        .select('id, order_id, customer_name, paper_type_name, gsm_value, dimension, ink, coating, status, progress')
        .eq('product_id', productId);

    console.log(`Found ${orders?.length || 0} orders\n`);

    if (orders) {
        orders.forEach(o => {
            const hasData = o.customer_name || o.paper_type_name || o.gsm_value;
            console.log(`Order ${o.order_id} (${hasData ? 'HAS DATA' : 'BLANK'}):`);
            console.log('  Customer:', o.customer_name || 'NULL');
            console.log('  Paper:', o.paper_type_name || 'NULL');
            console.log('  GSM:', o.gsm_value || 'NULL');
            console.log('  Status:', o.status);
            console.log('  Progress:', o.progress);
            console.log('');
        });
    }
}

diagnose();
