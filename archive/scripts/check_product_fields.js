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
    console.log('=== CHECKING PRODUCT FIELDS ===\n');

    const { data: product } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (product?.[0]) {
        console.log('Product columns:', Object.keys(product[0]).sort());
        console.log('\nSample product:');
        console.log(product[0]);
    }
})();
