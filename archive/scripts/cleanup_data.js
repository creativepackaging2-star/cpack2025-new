const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanup() {
    console.log('--- START CLEANUP ---');

    const productID = 'e6a2552c-fba7-4227-bb9c-e02b51e271f0';
    const orderIDs = [1422, 1423, 1424];

    console.log(`Checking orders: ${orderIDs.join(', ')}`);
    const { data: orders } = await supabase.from('orders').select('id').in('id', orderIDs);
    console.log('Found orders:', orders?.map(o => o.id) || []);

    if (orders && orders.length > 0) {
        console.log('Deleting orders...');
        const { error: oErr } = await supabase.from('orders').delete().in('id', orderIDs);
        if (oErr) console.error('Order Delete Error:', oErr);
        else console.log('Orders deleted successfully.');
    }

    console.log(`Deleting product: ${productID}`);
    const { error: pErr } = await supabase.from('products').delete().eq('id', productID);
    if (pErr) console.error('Product Delete Error:', pErr);
    else console.log('Product deleted successfully.');

    console.log('--- END CLEANUP ---');
}

cleanup().catch(console.error);
