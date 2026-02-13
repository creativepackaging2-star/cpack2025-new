
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateOrderCreation() {
    console.log('Simulating order creation for Strocoz 2 ml Carton with 30,000 qty...');

    // 1. Get the product
    const { data: products } = await supabase.from('products').select('*').ilike('product_name', '%Strocoz 2 ml Carton%');
    const prod = products[0];
    if (!prod) {
        console.error('Product not found');
        return;
    }

    const qty = 30000;
    const rate = 1.5; // Example rate
    const maxDelQty = Math.ceil(qty * 1.15);
    const paperUps = 1;
    const ups = parseInt(prod.ups) || 1;
    const totalPrintQty = Math.ceil(maxDelQty / ups);
    const paperRequired = Math.ceil(totalPrintQty / paperUps);

    const payload = {
        order_id: 'SIM-' + Date.now(),
        product_id: prod.id,
        product_name: prod.product_name,
        quantity: qty,
        rate: rate,
        value: qty * rate,
        max_del_qty: maxDelQty,
        total_print_qty: totalPrintQty,
        paper_required: paperRequired,
        status: 'In Production',
        progress: 'Paper',
        order_date: new Date().toISOString().split('T')[0],
        from_our_company: 'Packaging',
        billed: 'false'
    };

    console.log('Inserting payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await supabase.from('orders').insert([payload]).select();

    if (error) {
        console.error('INSERT FAILED:');
        console.error(error);
    } else {
        console.log('INSERT SUCCESSFUL. Data returned:');
        console.log(JSON.stringify(data[0], null, 2));
        // Clean up
        await supabase.from('orders').delete().eq('id', data[0].id);
        console.log('Cleaned up test order.');
    }
}

simulateOrderCreation();
