
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkColumns() {
    console.log("Checking columns in 'orders' table...");
    
    // We can just fetch one row and show keys if we can't query information_schema easily with anon key
    // But let's try to query a known column to fail/succeed
    
    const { data, error } = await supabase.from('orders').select('actual_gsm_used').limit(1);
    
    if (error) {
        console.log("Column 'actual_gsm_used' likely DOES NOT exist or is not accessible.");
        console.log("Error:", error.message);
    } else {
        console.log("Column 'actual_gsm_used' EXISTS and is accessible.");
    }
}

checkColumns();
