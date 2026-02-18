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
    console.log('--- STARTING DB INVESTIGATION ---');

    try {
        // 1. Check order_details columns
        console.log('\n1. Checking [order_details] table...');
        const { data: od, error: odErr } = await supabase.from('order_details').select('*').limit(1);
        if (odErr) {
            console.log('order_details table not found or error:', odErr.message);
        } else if (od && od.length > 0) {
            console.log('Columns in order_details:', Object.keys(od[0]).join(', '));

            // Check if there are any rows matching "Rasiklal"
            const { data: odRas } = await supabase.from('order_details').select('*').ilike('product_name', '%Rasiklal%').limit(5);
            console.log('\n"Rasiklal" rows in [order_details]:');
            odRas && odRas.forEach(r => {
                console.log(`- ID: ${r.id} | Name: [${r.product_name}]`);
                // Check for specification or similar columns
                const specCol = Object.keys(r).find(c => c.toLowerCase().includes('spec'));
                if (specCol) console.log(`  ${specCol}: [${r[specCol]}]`);
            });
        }

        // 2. Check Rasiklal in products and orders
        console.log('\n2. Checking "Rasiklal" in [products] and [orders]...');
        const { data: products } = await supabase.from('products').select('*, specifications(name)').ilike('product_name', '%Rasiklal%');
        if (products && products.length > 0) {
            for (const p of products) {
                console.log(`\nProduct: [${p.product_name}] (ID: ${p.id})`);
                console.log(`Master Spec: [${p.specifications?.name}]`);

                const { data: orders } = await supabase.from('orders').select('order_id, specification, status').eq('product_id', p.id).limit(5);
                console.log('Orders in [orders] table:');
                orders && orders.forEach(o => {
                    console.log(`- Order: ${o.order_id} | Status: ${o.status}`);
                    console.log(`  Snapshot Spec: [${o.specification}]`);
                });
            }
        } else {
            console.log('No Rasiklal products found.');
        }

    } catch (e) {
        console.error('Investigation Error:', e);
    }
}

check();
