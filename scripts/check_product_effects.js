const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) process.env[key.trim()] = val.trim();
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    // fetch a product that has special_effects set
    const { data: product, error: errProd } = await supabase
        .from('products')
        .select('id, sku, product_name, special_effects')
        .neq('special_effects', null)
        .limit(1)
        .single();

    if (errProd) return console.error('Error fetching product', errProd);

    console.log('Product:', product);

    const ids = product.special_effects.split(/[|/]/).map(v => v.trim()).filter(Boolean);
    const { data: effects, error: errEff } = await supabase
        .from('special_effects')
        .select('id, name')
        .in('id', ids);

    if (errEff) return console.error('Error fetching effects', errEff);

    console.log('Effect names for this product:');
    console.table(effects);
}

check();
