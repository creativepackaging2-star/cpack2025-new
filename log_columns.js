
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
    const { data: orders } = await supabase.from('orders').select('*').limit(1);
    console.log('--- Orders Columns ---');
    console.log(Object.keys(orders[0] || {}).join(', '));

    const { data: products } = await supabase.from('products').select('*').limit(1);
    console.log('\n--- Products Columns ---');
    console.log(Object.keys(products[0] || {}).join(', '));
}
run();
