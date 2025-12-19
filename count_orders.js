
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
    const { count: c1 } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { count: c2 } = await supabase.from('orders_enhanced').select('*', { count: 'exact', head: true });
    console.log(`orders: ${c1}`);
    console.log(`orders_enhanced: ${c2}`);
}
run();
