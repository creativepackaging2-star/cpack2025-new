
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkCategoryColumn() {
    console.log("Checking if 'category_name' column exists in 'orders'...");

    // Attempt to select 'category_name' from 'orders'
    const { data, error } = await supabase.from('orders').select('category_name').limit(1);

    if (error) {
        console.log("Column 'category_name' likely DOES NOT exist.");
        console.log("Error:", error.message);
    } else {
        console.log("Column 'category_name' EXISTS.");
    }

    console.log("Checking if 'actual_gsm_used' column exists in 'orders'...");
    const { data: gsmData, error: gsmError } = await supabase.from('orders').select('actual_gsm_used').limit(1);

    if (gsmError) {
        console.log("Column 'actual_gsm_used' likely DOES NOT exist.");
    } else {
        console.log("Column 'actual_gsm_used' EXISTS.");
    }
}

checkCategoryColumn();
