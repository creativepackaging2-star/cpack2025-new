const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').filter(line => line.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        if (k && v) env[k.trim()] = v.trim();
    });
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testQuery() {
    console.log('Testing COA/Shade Card Query with Explicit Hints...');

    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            products (
                id,
                product_name,
                artwork_code,
                dimension,
                folding,
                folding_dim,
                delivery_address_id,
                ink,
                plate_no,
                coating,
                special_effects,
                specs,
                artwork_pdf,
                artwork_cdr,
                specifications!fk_specification (name),
                pasting!fk_pasting (name),
                constructions!fk_construction (name),
                gsm!fk_gsm (name),
                paper_types!fk_paper_type (name),
                sizes!fk_size (name)
            )
        `)
        .limit(1);

    if (error) {
        console.error('QUERY FAILED:', error.message);
        console.log('FULL ERROR OBJECT:', JSON.stringify(error, null, 2));
    } else {
        console.log('QUERY SUCCESSFUL!');
        console.log('Product details sample:', JSON.stringify(data[0]?.products, null, 2));
    }
}

testQuery();
