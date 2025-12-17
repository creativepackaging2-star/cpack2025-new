const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let envVars = {};
try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            envVars[key.trim()] = valParts.join('=').trim();
        }
    });
} catch (e) { }

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Fetching one product to see columns...');
    const { data, error } = await supabase.from('products').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No products found to inspect columns. Trying schema info...');
        // Fallback: This user might be admin or we can try to infer if empty
        console.log('Table is empty.');
    }
}

inspect();
