
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectLookups() {
    console.log('--- GSM Table ---');
    const { data: gsm } = await supabase.from('gsm').select('*').limit(5);
    console.log(gsm);

    console.log('\n--- Sizes Table ---');
    const { data: sizes } = await supabase.from('sizes').select('*').limit(5);
    console.log(sizes);

    console.log('\n--- Sample Products ---');
    const { data: products } = await supabase.from('products').select('product_name, gsm_id, size_id, dimension, specs').limit(3);
    console.log(products);
}

inspectLookups();
