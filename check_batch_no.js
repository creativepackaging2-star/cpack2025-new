
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('id, order_id, product_name, batch_no, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Latest Orders:');
    data.forEach(order => {
        console.log(`ID: ${order.id}, OrderID: ${order.order_id}, Product: ${order.product_name}, BatchNo: "${order.batch_no}", CreatedAt: ${order.created_at}`);
    });
}

checkLatestOrders();
