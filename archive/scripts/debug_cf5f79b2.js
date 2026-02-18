
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            process.env[key.trim()] = valParts.join('=').trim();
        }
    });
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debug() {
    const { data } = await supabase.from('orders')
        .select('id, order_id, product_id, product_sku')
        .eq('order_id', 'cf5f79b2')
        .single();

    console.log('Order cf5f79b2:');
    console.log('  product_id:', data.product_id);
    console.log('  product_sku:', data.product_sku);

    if (data.product_id) {
        const { data: prod } = await supabase.from('products')
            .select('id, sku, product_name')
            .eq('id', data.product_id)
            .single();

        console.log('\nLinked Product:');
        if (prod) {
            console.log('  Found:', prod.product_name, '(SKU:', prod.sku, ')');
        } else {
            console.log('  NOT FOUND - orphaned order!');
        }
    }
}

debug();
