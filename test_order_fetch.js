
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('Testing fetch with exact select string from page.tsx...');
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            products (
                product_name, 
                artwork_code, 
                specs, 
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
        console.error('FETCH ERROR:', JSON.stringify(error, null, 2));
    } else {
        console.log('FETCH SUCCESS. Found', data.length, 'orders.');
    }
}

testFetch();
