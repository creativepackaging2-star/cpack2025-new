
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetchWithDetails() {
    console.log('Testing the exact fetch query from page.tsx to find 400 error...');
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
        .limit(1);

    if (error) {
        console.error('ERROR CODE:', error.code);
        console.error('ERROR MESSAGE:', error.message);
        console.error('ERROR DETAILS:', error.details);
        console.error('ERROR HINT:', error.hint);
    } else {
        console.log('Fetch successful. Sample order structure:');
        console.log(JSON.stringify(data[0], null, 2));
    }
}

testFetchWithDetails();
