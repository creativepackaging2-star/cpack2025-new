
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApatide() {
    console.log('Searching for "APATIDE"...');

    // Find Product
    const { data: products, error: pErr } = await supabase
        .from('products')
        .select('*, sizes(name)')
        .ilike('product_name', '%APATIDE%');

    if (pErr) {
        console.error('Error fetching products:', pErr);
        return;
    }

    console.log('Found Products:', JSON.stringify(products, null, 2));

    if (products.length > 0) {
        const productIds = products.map(p => p.id);

        // Find Orders for these products
        const { data: orders, error: oErr } = await supabase
            .from('orders')
            .select('*')
            .in('product_id', productIds)
            .order('created_at', { ascending: false });

        if (oErr) {
            console.error('Error fetching orders:', oErr);
            return;
        }

        console.log('Found Orders:', JSON.stringify(orders, null, 2));
    }
}

checkApatide();
