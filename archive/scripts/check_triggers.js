const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
lines.forEach(l => {
    const parts = l.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    const { data: triggers, error } = await supabase.rpc('get_triggers', { table_name: 'orders' });
    if (error) {
        // Fallback: use a common query if RPC isn't available
        console.log('Trying direct query for triggers...');
        const { data: t2, error: e2 } = await supabase.from('pg_trigger').select('tgname').limit(10);
        console.log('Triggers (raw):', t2 || e2);
    } else {
        console.log('Triggers on orders:', triggers);
    }
})();
