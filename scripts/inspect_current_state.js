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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Environment Functions (could not read .env.local)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    const report = [];
    const log = (msg) => {
        console.log(msg);
        report.push(msg);
    };

    log('--- Inspecting Products Table Schema ---');

    // 1. Get one row to see standard columns
    const { data: rows, error } = await supabase
        .from('products')
        .select('*')
        .limit(5);

    if (error) {
        log('Error fetching rows: ' + error.message);
    } else if (rows.length > 0) {
        log('Sample Data Data (Keys/Types):');
        const sample = rows[0];
        Object.keys(sample).forEach(key => {
            log(` - ${key}: (${typeof sample[key]}) value example: ${sample[key]}`);
        });

        // Check for "mixed" types in SKU or IDs if possible by checking a few rows
        log('\n--- Checking for ID/SKU Consistency (First 5) ---');
        rows.forEach(r => {
            log(`ID: ${r.id} (type: ${typeof r.id}), SKU: ${r.sku}, Artwork: ${r.artwork_code}`);
        });

    } else {
        log('No rows found in products table.');
    }

    // 2. Try to List Tables (Lookup check)
    log('\n--- Checking Existence of New Tables ---');
    const tablesToCheck = ['coating', 'specifications', 'delivery_addresses'];
    for (const table of tablesToCheck) {
        const { count, error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (tableError) {
            log(`[ ] Table '${table}' DOES NOT exist (or not public). Error: ${tableError.message}`);
        } else {
            log(`[x] Table '${table}' EXISTS. Row count: ${count}`);
        }
    }

    fs.writeFileSync('schema_report.txt', report.join('\n'));
}

inspectSchema();
