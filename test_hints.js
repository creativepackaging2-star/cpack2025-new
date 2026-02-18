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

async function check() {
    console.log('--- JOIN WITH HINTS ---');

    // Try explicit join via column name
    const { data, error } = await supabase
        .from('products')
        .select(`
            id,
            product_name,
            spec:specifications!specification_id(name),
            gsm:gsm!gsm_id(name),
            paper:paper_types!paper_type_id(name)
        `)
        .limit(1);

    if (error) {
        console.log(`Join with hints failed: ${error.message}`);
    } else {
        console.log(`Join with hints WORKED! Sample Data:`, JSON.stringify(data[0], null, 2));
    }
}

check();
