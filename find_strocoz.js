
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProduct() {
    const { data, error } = await supabase
        .from('products')
        .select('id, product_name, artwork_code, ups, last_rate, specs')
        .ilike('product_name', '%Strocoz%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found:', data);
}

checkProduct();
