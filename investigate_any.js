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

const query = process.argv[2] || 'Rasiklal';

async function check() {
    try {
        console.log(`--- Investigating "${query}" ---`);

        const { data: products, error: pErr } = await supabase
            .from('products')
            .select('*, specifications(name)')
            .ilike('product_name', `%${query}%`);

        if (pErr) throw pErr;

        if (!products || products.length === 0) {
            console.log('No matching products found.');
            return;
        }

        for (const p of products) {
            console.log('\n========================================');
            console.log('PRODUCT MASTER:');
            console.log('ID:               ', p.id);
            console.log('Name:             ', p.product_name);
            console.log('Specs Field:      ', p.specs);
            console.log('Linked Spec Name: ', p.specifications?.name);
            console.log('Artwork Code:     ', p.artwork_code);

            const { data: orders, error: oErr } = await supabase
                .from('orders')
                .select('id, order_id, product_name, specification, specs, status, created_at')
                .eq('product_id', p.id)
                .order('created_at', { ascending: false });

            if (oErr) throw oErr;

            if (orders && orders.length > 0) {
                console.log(`\nORDERS FOUND: ${orders.length}`);
                orders.forEach(o => {
                    console.log(`- [${o.status}] ${o.order_id} (${o.created_at})`);
                    console.log(`  Snapshot Name:  ${o.product_name}`);
                    console.log(`  Snapshot Spec:  ${o.specification}`);
                    console.log(`  Snapshot Specs: ${o.specs}`);
                });
            } else {
                console.log('\nNo orders found for this product.');
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

check();
