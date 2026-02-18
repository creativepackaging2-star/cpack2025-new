
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
        .select('*')
        .ilike('product_name', '%Strocoz 2 ml%');

    if (error) {
        console.error('Error fetching product:', error);
        return;
    }

    console.log('Products found:', JSON.stringify(data, null, 2));
}

checkProduct();
