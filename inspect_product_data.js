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
        console.log('--- DB INSPECTION START ---');
        console.log('Searching for "BD Foie" related products...');

        // 1. Search in Products (simpler select)
        const { data: products, error: pErr } = await supabase
            .from('products')
            .select('id, product_name, specification_id, specs')
            .ilike('product_name', '%BD Foie%');

        if (pErr) throw pErr;

        if (!products || products.length === 0) {
            console.log('No matching products found.');
            return;
        }

        for (const p of products) {
            console.log('\n========================================');
            console.log('PRODUCT MASTER RECORD');
            console.log('ID:  ', p.id);
            console.log('Name:', p.product_name);
            console.log('Specs Field (Internal):', p.specs || 'None');

            if (p.specification_id) {
                const { data: s } = await supabase.from('specifications').select('name').eq('id', p.specification_id).single();
                console.log('Specification Column (Linked Name):', s?.name || 'ID ' + p.specification_id + ' NOT FOUND IN TABLE');
            } else {
                console.log('Specification Column: NULL');
            }

            // 2. Search in Orders (Completed preferred)
            const { data: orders, error: oErr } = await supabase
                .from('orders')
                .select('id, order_id, product_name, specification, specs, status')
                .eq('product_id', p.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (oErr) throw oErr;

            if (orders && orders.length > 0) {
                console.log('\nORDERS FOR THIS PRODUCT:');
                orders.forEach(o => {
                    console.log(`- Order ID: ${o.order_id} | Status: ${o.status}`);
                    console.log(`  Name in Order Snapshot: ${o.product_name}`);
                    console.log(`  Specification Snapshot: ${o.specification}`);
                    console.log(`  Specs Snapshot:         ${o.specs}`);
                });
            } else {
                console.log('\nNo orders found for this product.');
            }
        }
    } catch (e) {
        console.error('Error during inspection:', e);
    }
}

check();
