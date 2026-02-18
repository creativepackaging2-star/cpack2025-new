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

async function diagnose() {
    console.log('--- STARTING COMPREHENSIVE DIAGNOSIS ---');

    try {
        // 1. Check for product "K Rasiklal Brochures"
        console.log('\n1. Searching for "Rasiklal" in products...');
        const { data: products } = await supabase.from('products').select('*, specifications(name)').ilike('product_name', '%Rasiklal%');
        if (!products || products.length === 0) {
            console.log('No Rasiklal products found.');
        } else {
            products.forEach(p => {
                console.log(`- Product Name: [${p.product_name}] (ID: ${p.id})`);
                console.log(`  Spec ID: ${p.specification_id} | Linked Spec Name: ${p.specifications?.name}`);
                console.log(`  Internal Specs Field: ${p.specs}`);
            });

            // Check orders for the first match
            const pId = products[0].id;
            console.log(`\n2. Searching for orders for product ID: ${pId}`);
            const { data: orders } = await supabase.from('orders').select('*').eq('product_id', pId).limit(5);
            if (orders && orders.length > 0) {
                orders.forEach(o => {
                    console.log(`- Order: ${o.order_id} | Status: ${o.status}`);
                    console.log(`  Snapshot Specification: [${o.specification}]`);
                    console.log(`  Snapshot Specs:         [${o.specs}]`);
                });
            } else {
                console.log('No orders found for this product.');
            }
        }

        // 3. Search for "enhanced" tables or columns
        console.log('\n3. Searching for "enhanced" in table/column names if possible...');
        // Since we can't easily list all tables without a specific RPC, let's try to query some likely names.
        const likelyTables = ['orders_enhanced', 'enhanced_orders', 'products_enhanced', 'order_details'];
        for (const tableName of likelyTables) {
            const { data, error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });
            if (!error) {
                console.log(`- Found table: ${tableName}`);
            }
        }

        // 4. Check 'orders' table columns again
        console.log('\n4. Checking all columns in the "orders" table...');
        const { data: colsData } = await supabase.from('orders').select('*').limit(1);
        if (colsData && colsData.length > 0) {
            console.log('Columns in orders table:', Object.keys(colsData[0]).join(', '));
        }

    } catch (e) {
        console.error('Diagnosis Error:', e);
    }
}

diagnose();
