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
    console.warn('No .env.local found');
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('--- TESTING UPDATE PERMISSIONS ---');

    // 1. Get an order
    const { data: orders } = await supabase.from('orders').select('id, artwork_code').limit(1);
    if (!orders || orders.length === 0) {
        console.log('No orders to test.');
        return;
    }

    const order = orders[0];
    const originalCode = order.artwork_code;
    const testCode = 'TEST-CODE-' + Math.floor(Math.random() * 1000);

    console.log(`Testing Update on Order ${order.id}`);
    console.log(`Current Code: ${originalCode}`);
    console.log(`New Code:     ${testCode}`);

    // 2. Try Update
    const { data: updated, error } = await supabase
        .from('orders')
        .update({ artwork_code: testCode })
        .eq('id', order.id)
        .select();

    if (error) {
        console.error('❌ UPDATE FAILED with Error:', error);
        console.error('Code:', error.code);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);
    } else {
        if (updated && updated.length > 0 && updated[0].artwork_code === testCode) {
            console.log('✅ Update SUCCESSFUL!');
            // Revert
            await supabase.from('orders').update({ artwork_code: originalCode }).eq('id', order.id);
            console.log('Restored original value.');
        } else {
            console.log('⚠️ Update returned no data or incorrect data. Possibly RLS silent reject.');
            console.log('Returned:', updated);
        }
    }
})();
