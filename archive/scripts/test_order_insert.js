
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    // 1. Find product
    const { data: prods } = await supabase.from('products').select('*').ilike('product_name', '%Strocoz%');
    if (!prods || prods.length === 0) {
        console.log('Product not found for testing');
        return;
    }
    const p = prods[0];
    console.log('Testing with product:', p.product_name, 'ID:', p.id);

    // 2. Prepare payload similar to OrderForm.tsx
    const qty = 30000;
    const rate = p.last_rate || 0; // Might be different column name
    const orderData = {
        order_id: 'TEST-' + Date.now(),
        product_id: p.id,
        product_name: p.product_name,
        quantity: qty,
        status: 'In Production',
        progress: 'Paper',
        order_date: new Date().toISOString().split('T')[0],
        rate: rate,
        value: qty * rate,
        max_del_qty: Math.ceil(qty * 1.15),
        from_our_company: 'Packaging'
    };

    console.log('Attempting insert with:', JSON.stringify(orderData, null, 2));

    const { data, error } = await supabase.from('orders').insert([orderData]).select();

    if (error) {
        console.error('INSERT ERROR:', JSON.stringify(error, null, 2));
    } else {
        console.log('INSERT SUCCESS:', data);
        // Clean up
        await supabase.from('orders').delete().eq('id', data[0].id);
        console.log('Test record cleaned up');
    }
}

testInsert();
