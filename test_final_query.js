
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testQuery() {
    console.log('Testing the exact query from Orders page...');
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            products (
                product_name, 
                artwork_code, 
                dimension,
                artwork_pdf, 
                artwork_cdr, 
                category_id,
                paper_type_id,
                gsm_id,
                actual_gsm_used
            )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('QUERY FAILED:', error.message);
    } else {
        console.log('QUERY SUCCESSFUL. Found', data.length, 'orders.');
        if (data.length > 0) {
            console.log('First order:', data[0].product_name, 'ID:', data[0].id);
        }
    }
}
testQuery();
