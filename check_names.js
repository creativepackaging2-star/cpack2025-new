
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExactName() {
    const { data } = await supabase.from('products').select('product_name').ilike('product_name', '%Strocoz%');
    console.log('Exact names:');
    data.forEach(p => console.log(`'${p.product_name}'`));
}

checkExactName();
