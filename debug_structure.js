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
        console.log('--- STRUCTURAL DIAGNOSTIC: K RASIKLAL ---');

        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id, 
                order_id, 
                product_name, 
                specification, 
                products (
                    id,
                    product_name,
                    specifications (name)
                )
            `)
            .ilike('product_name', '%Rasiklal%')
            .limit(1);

        if (error) {
            console.error('Fetch Error:', error);
            return;
        }

        if (!orders || orders.length === 0) {
            console.log('No order found.');
            return;
        }

        const o = orders[0];
        console.log('Order ID:', o.order_id);
        console.log('Snapshot Specification:', o.specification);
        console.log('Products Property Type:', typeof o.products, Array.isArray(o.products) ? '(ARRAY)' : '(OBJECT)');
        console.log('Products Content:', JSON.stringify(o.products, null, 2));

        if (Array.isArray(o.products) && o.products.length > 0) {
            const p = o.products[0];
            console.log('Resolved Spec Name via Array:', p.specifications?.name);
        } else if (o.products) {
            const p = o.products;
            console.log('Resolved Spec Name via Object:', p.specifications?.name);
        }

    } catch (e) {
        console.error('Runtime Error:', e);
    }
}

check();
