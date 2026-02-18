
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

async function run() {
    const { data: o8000 } = await supabase.from('orders').select('*').eq('quantity', 8000).ilike('product_name', '%Rivaflo%');
    const { data: o2000 } = await supabase.from('orders').select('*').eq('quantity', 2000).ilike('product_name', '%Rivaflo%');
    const { data: o2000alt } = await supabase.from('orders').select('*').eq('quantity', 2000).ilike('product_name', '%rewaflo%');

    console.log('--- 8000 Qty Rivaflo ---');
    console.log(JSON.stringify(o8000, null, 2));
    console.log('--- 2000 Qty Rivaflo ---');
    console.log(JSON.stringify(o2000, null, 2));
    console.log('--- 2000 Qty Rewaflo ---');
    console.log(JSON.stringify(o2000alt, null, 2));
}
run();
