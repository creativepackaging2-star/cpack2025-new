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

// Helper for logging
function log(msg) {
    console.log(msg);
    fs.appendFileSync('verification_log.txt', msg + '\n');
}

(async () => {
    try {
        fs.writeFileSync('verification_log.txt', ''); // Clear log
        log('--- VERIFYING SPECIAL EFFECTS SYNC ---');

        const dummyId = '00000000-0000-0000-0000-000000000000';

        // Clean up first
        await supabase.from('orders').delete().eq('product_id', dummyId);
        await supabase.from('products').delete().eq('id', dummyId);

        log('Creating Test Product with Effect IDs...');
        // Using ID '1' which corresponds to 'Silver Foil' based on lookup
        const { data: prod, error: prodError } = await supabase
            .from('products')
            .insert({
                id: dummyId,
                product_name: 'EF_TEST_PRODUCT_SMART',
                dimension: '10x10x10',
                special_effects: '1', // ID for Silver Foil
                specs: '10x10x10'
            })
            .select()
            .single();

        if (prodError) {
            log('Failed to create test product: ' + JSON.stringify(prodError));
            return;
        }

        log('Product Created. Specs in DB: ' + prod.specs);

        // Validation
        if (prod.specs && prod.specs.includes('Silver Foil')) {
            log('SMART RESOLUTION SUCCESS: Found "Silver Foil" in specs!');
        } else {
            log('SMART RESOLUTION FAILED: "Silver Foil" NOT found. Specs: ' + prod.specs);
        }

        // Clean up
        await supabase.from('orders').delete().eq('product_id', dummyId);
        await supabase.from('products').delete().eq('id', dummyId);

    } catch (err) {
        log('ERROR: ' + err.message);
    }
})();
