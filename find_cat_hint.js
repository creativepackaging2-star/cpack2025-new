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

async function findCategoryHint() {
    console.log('Checking category relationship hint...');
    const { error } = await supabase
        .from('products')
        .select(`id, category (name)`)
        .limit(1);

    if (error) {
        fs.writeFileSync('cat_hint_error.json', JSON.stringify(error, null, 2));
        console.log('Error written to cat_hint_error.json');
    } else {
        console.log('NO ERROR');
    }
}

findCategoryHint();
