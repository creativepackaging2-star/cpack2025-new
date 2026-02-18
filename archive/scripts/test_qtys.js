
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuantities() {
    const { data: prods } = await supabase.from('products').select('*').ilike('product_name', '%Strocoz 2 ml Carton%');
    if (!prods || prods.length === 0) return;
    const p = prods[0];

    const qtys = [5000, 10000, 30000, 50000];

    for (const q of qtys) {
        console.log(`Testing QTY: ${q}`);
        const orderData = {
            order_id: 'TEST-' + q + '-' + Date.now(),
            product_id: p.id,
            product_name: p.product_name,
            quantity: q,
            status: 'In Production',
            progress: 'Paper',
            order_date: new Date().toISOString().split('T')[0],
            rate: 1.5, // Dummy rate
            value: q * 1.5,
            max_del_qty: Math.ceil(q * 1.15),
            from_our_company: 'Packaging'
        };

        const { data, error } = await supabase.from('orders').insert([orderData]).select();
        if (error) {
            console.error(`FAILED for ${q}:`, error.message, error.details);
        } else {
            console.log(`SUCCESS for ${q}`);
            await supabase.from('orders').delete().eq('id', data[0].id);
        }
    }
}

testQuantities();
