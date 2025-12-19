
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

async function manualFix() {
    const orderId = 'cf5f79b2';

    // Get the order
    const { data: order } = await supabase.from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    console.log('Current order data:');
    console.log('customer_name:', order.customer_name);
    console.log('paper_type_name:', order.paper_type_name);
    console.log('gsm_value:', order.gsm_value);

    // Manually set the values
    const { error } = await supabase.from('orders')
        .update({
            customer_name: 'Bdr Pharmaceuticals International Pvt. Ltd.',
            paper_type_name: 'Maplitho',
            gsm_value: '60',
            dimension: '140 x 300',
            ink: 'BLACK'
        })
        .eq('order_id', orderId);

    if (error) {
        console.log('ERROR:', error);
    } else {
        console.log('\nUPDATE SUCCESSFUL');

        // Verify
        const { data: check } = await supabase.from('orders')
            .select('customer_name, paper_type_name, gsm_value')
            .eq('order_id', orderId)
            .single();

        console.log('\nVerification:');
        console.log('customer_name:', check.customer_name);
        console.log('paper_type_name:', check.paper_type_name);
        console.log('gsm_value:', check.gsm_value);
    }
}

manualFix();
