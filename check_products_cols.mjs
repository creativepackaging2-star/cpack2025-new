import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkColumns() {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) {
        console.error(error);
        return;
    }
    if (data && data.length > 0) {
        console.log(JSON.stringify(Object.keys(data[0]), null, 2));
    } else {
        const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'products' });
        if (colErr) console.log("Empty table and rpc failed");
        else console.log(cols);
    }
}

checkColumns();
