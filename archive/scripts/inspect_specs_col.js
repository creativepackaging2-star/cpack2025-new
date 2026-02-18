const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const env = {};
try {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) {
    console.warn('No .env.local found');
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('--- INSPECTING PRODUCTS TABLE TRIGGERS & GENERATED COLS ---');

    // 1. Get info on 'specs' column
    const { data: cols, error: colError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'products')
        .eq('column_name', 'specs');

    if (colError) console.error('Col Error:', colError);
    else console.log('Specs Column Info:', JSON.stringify(cols, null, 2));

    // 2. List all triggers on products
    // Note: direct access to information_schema.triggers via Supabase JS client might be restricted or return empty if RLS on system tables matches generic user.
    // But let's try.
    const { data: triggers, error: trigError } = await supabase
        .rpc('get_triggers', { table_name: 'products' });
    // We probably don't have this RPC.

    // Fallback: try raw query if we could, but we can't via JS client easily.
    // We will infer from 'specs' column info. "is_generated" or "generation_expression".

})();
