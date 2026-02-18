const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== CHECKING FOR PRODUCT_NAME COLUMN ===\n');

    const { data: orderSample, error: orderError } = await supabase.from('orders').select('*').limit(1);
    const { data: productSample, error: productError } = await supabase.from('products').select('*').limit(1);

    if (orderError) console.error('Orders error:', orderError);
    if (productError) console.error('Products error:', productError);

    if (orderSample && orderSample[0]) {
        console.log('Orders columns:', Object.keys(orderSample[0]).sort().join(', '));
        console.log('Does orders have product_name?', Object.keys(orderSample[0]).includes('product_name') ? 'YES' : 'NO');
    }

    if (productSample && productSample[0]) {
        console.log('\nProducts columns:', Object.keys(productSample[0]).sort().join(', '));
        console.log('Does products have product_name?', Object.keys(productSample[0]).includes('product_name') ? 'YES' : 'NO');
    }
})();
