const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.trim();
        }
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSpecialEffects() {
    console.log('--- Current Special Effects Lookups ---');
    const { data: effects, error } = await supabase.from('special_effects').select('*');

    let output = '';
    if (effects) {
        output = JSON.stringify(effects, null, 2);
        console.log(output);
    } else {
        console.error(error);
        output = JSON.stringify(error);
    }
    fs.writeFileSync('effects_list.json', output);
}

checkSpecialEffects();
