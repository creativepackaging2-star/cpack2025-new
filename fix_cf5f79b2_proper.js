
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

async function fixOne() {
    // Clear test data
    await supabase.from('orders')
        .update({
            customer_name: null,
            paper_type_name: null,
            gsm_value: null
        })
        .eq('order_id', 'cf5f79b2');

    console.log('Cleared test data. Now fixing properly...');

    // Get product
    const { data: product } = await supabase.from('products')
        .select('*')
        .eq('sku', '598')
        .single();

    // Get lookups
    const { data: customer } = await supabase.from('customers').select('name').eq('id', product.customer_id).single();
    const { data: paper } = await supabase.from('paper_types').select('name').eq('id', product.paper_type_id).single();
    const { data: gsm } = await supabase.from('gsm').select('name').eq('id', product.gsm_id).single();

    // Update order
    const { error } = await supabase.from('orders')
        .update({
            customer_name: customer.name,
            paper_type_name: paper.name,
            gsm_value: gsm.name,
            dimension: product.dimension,
            ink: product.ink,
            coating: product.coating
        })
        .eq('order_id', 'cf5f79b2');

    if (error) {
        console.log('ERROR:', error);
    } else {
        console.log('SUCCESS!');

        // Verify
        const { data: check } = await supabase.from('orders')
            .select('customer_name, paper_type_name, gsm_value, dimension, ink')
            .eq('order_id', 'cf5f79b2')
            .single();

        console.log('\nVerified:');
        console.log('Customer:', check.customer_name);
        console.log('Paper:', check.paper_type_name);
        console.log('GSM:', check.gsm_value);
        console.log('Dimension:', check.dimension);
        console.log('Ink:', check.ink);
    }
}

fixOne();
