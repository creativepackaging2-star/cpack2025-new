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

async function checkAllRels() {
    const tables = ['specifications', 'pasting', 'constructions', 'gsm', 'paper_types', 'sizes', 'categories'];
    const results = {};

    for (const table of tables) {
        console.log(`Checking ${table}...`);
        const { error } = await supabase
            .from('products')
            .select(`id, ${table} (name)`)
            .limit(1);

        if (error && error.code === 'PGRST201') {
            results[table] = error.hint;
        } else if (error) {
            results[table] = `ERROR: ${error.message}`;
        } else {
            results[table] = 'NO HINT NEEDED (Unique)';
        }
    }

    fs.writeFileSync('all_hints.json', JSON.stringify(results, null, 2));
    console.log('Results written to all_hints.json');
}

checkAllRels();
