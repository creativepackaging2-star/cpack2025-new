const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) {
    console.warn('No .env.local found, assuming env vars set.');
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('=== DIAGNOSING SYNC ISSUES ===\n');

    // 1. Check if we can read orders
    const { data: orders, error: readError } = await supabase.from('orders').select('id, artwork_code, product_name').limit(1);
    if (readError) {
        console.error('❌ Error reading orders:', readError);
    } else {
        console.log('✅ Read orders permission: OK');
        console.log('Sample Order:', orders[0]);
    }

    // 2. Check Triggers (via Postgres function if available, or just infer from behavior)
    // Since we don't have direct SQL access to pg_catalogs easily without service role key or special function, 
    // we'll skip direct schema inspection and rely on behavior.

    // 3. Test Update Behavior
    if (orders && orders.length > 0) {
        const testOrder = orders[0];
        console.log(`\nAttempting to update Order ID ${testOrder.id}...`);

        const originalCode = testOrder.artwork_code;
        const testCode = 'TEST-' + Math.floor(Math.random() * 1000);

        const { data: updateData, error: updateError } = await supabase
            .from('orders')
            .update({ artwork_code: testCode })
            .eq('id', testOrder.id)
            .select();

        if (updateError) {
            console.error('❌ UPDATE FAILED:', updateError);
        } else {
            console.log('✅ UPDATE SUCCESSFUL. New Data:', updateData[0]);

            // Revert
            console.log('Reverting change...');
            await supabase.from('orders').update({ artwork_code: originalCode }).eq('id', testOrder.id);
            console.log('✅ Reverted.');
        }
    }

    console.log('\n=== RLS POLICY CHECK (Inferred) ===');
    // We can't query pg_policies directly via anon key usually. 
    // But the update test above confirms if RLS allows updates.

})();
