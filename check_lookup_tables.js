const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== CHECKING LOOKUP TABLES ===\n');

    // Check for size table
    const { data: sizes, error: sizeError } = await supabase
        .from('size')
        .select('id, name')
        .limit(5);

    console.log('Size table:', sizes || sizeError);

    // Check for printer table
    const { data: printers, error: printerError } = await supabase
        .from('printer')
        .select('*')
        .limit(5);

    console.log('\nPrinter table:', printers || printerError);

    // Check for paperwala table
    const { data: paperwalas, error: paperwalaError } = await supabase
        .from('paperwala')
        .select('*')
        .limit(5);

    console.log('\nPaperwala table:', paperwalas || paperwalaError);
})();
