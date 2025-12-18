
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Orders Table Columns ---');
    const { data: order, error: orderError } = await supabase.from('orders').select('*').limit(1).single();
    if (orderError) console.error('Order Error:', orderError);
    else console.log(Object.keys(order).join(', '));

    console.log('\n--- Orders Enhanced Columns ---');
    const { data: enhanced, error: enhancedError } = await supabase.from('orders_enhanced').select('*').limit(1).single();
    if (enhancedError) console.error('Enhanced Error (might not exist):', enhancedError.message);
    else console.log(Object.keys(enhanced).join(', '));
}

inspect();
