const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
lines.forEach(l => {
    const parts = l.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // If RLS allows
    if (error) {
        console.log('RPC failed, trying brute force on common names...');
        const tables = ['products', 'orders', 'Products', 'Orders', 'category', 'customers'];
        for (const t of tables) {
            const { error: e } = await supabase.from(t).select('count', { count: 'exact', head: true });
            console.log(`${t}: ${e ? 'ERROR (' + e.message + ')' : 'FOUND'}`);
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables();
