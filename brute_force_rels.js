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
    console.log('--- RELATIONSHIP BRUTEFORCE ---');
    const candidates = ['specifications', 'specification', 'specifications_table', 'specs_table', 'specification_id'];

    for (const c of candidates) {
        const { data, error } = await supabase
            .from('products')
            .select(`id, ${c}(name)`)
            .limit(1);

        if (error) {
            console.log(`Candidate '${c}' failed: ${error.message}`);
        } else {
            console.log(`Candidate '${c}' WORKED!`);
            break;
        }
    }

    // Also check GSM and others
    const others = ['gsm', 'pasting', 'constructions', 'paper_types', 'sizes'];
    for (const c of others) {
        const { data, error } = await supabase
            .from('products')
            .select(`id, ${c}(name)`)
            .limit(1);
        if (error) {
            console.log(`Rel '${c}' failed: ${error.message}`);
        } else {
            console.log(`Rel '${c}' WORKED!`);
        }
    }
}

check();
