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

async function check() {
    try {
        console.log('--- DIAGNOSTIC: K RASIKLAL ---');

        // 1. Fetch Product Master
        const { data: products } = await supabase
            .from('products')
            .select('id, product_name, specification_id, specs')
            .ilike('product_name', '%Rasiklal%');

        if (!products || products.length === 0) {
            console.log('No product found for "Rasiklal"');
            return;
        }

        const p = products[0];
        console.log('PRODUCT MASTER:');
        console.log('- Name:', p.product_name);
        console.log('- Internal Technical Specs:', p.specs || 'None');

        // Fetch Specification Name
        if (p.specification_id) {
            const { data: spec } = await supabase
                .from('specifications')
                .select('name')
                .eq('id', p.specification_id)
                .single();
            console.log('- Specification Name (from linked table):', spec?.name || 'ID NOT FOUND');
        } else {
            console.log('- Specification ID: NULL');
        }

        // 2. Fetch Order Snapshot
        const { data: order } = await supabase
            .from('orders')
            .select('id, order_id, product_name, specification, specs')
            .eq('product_id', p.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (order) {
            console.log('\nLATEST ORDER SNAPSHOT:');
            console.log('- Order ID:', order.order_id);
            console.log('- Snapshot Product Name:', order.product_name);
            console.log('- Snapshot Specification (The field in question):', order.specification);
            console.log('- Snapshot Technical Specs:', order.specs);
        } else {
            console.log('\nNo orders found for this product.');
        }

    } catch (e) {
        console.error('Error during diagnostic:', e);
    }
}

check();
