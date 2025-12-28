const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanup() {
    console.log('--- FINAL CLEANUP START ---');

    const orderIDs = [1422, 1423, 1424];
    const productID = 'e6a2552c-fba7-4227-bb9c-e02b51e271f0';

    // Delete Orders
    console.log(`Attempting to delete orders: ${orderIDs.join(', ')}`);
    const { data: oData, error: oErr } = await supabase.from('orders').delete().in('id', orderIDs).select();
    if (oErr) console.error('Order Delete Error:', oErr);
    else console.log('Deleted orders:', oData?.length || 0);

    // Delete Product
    console.log(`Attempting to delete product: ${productID}`);
    const { data: pData, error: pErr } = await supabase.from('products').delete().eq('id', productID).select();
    if (pErr) console.error('Product Delete Error:', pErr);
    else console.log('Deleted product:', pData?.length || 0);

    console.log('--- FINAL CLEANUP END ---');
}

cleanup().catch(console.error);
