const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
    return env;
}

const env = getEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testUpdate() {
    // Get one active order
    const { data: order } = await supabase
        .from('orders')
        .select('id, status')
        .neq('status', 'Complete')
        .limit(1)
        .single();

    if (!order) {
        console.log('No active orders found to test.');
        return;
    }

    const originalStatus = order.status;
    console.log(`Step 1: Found Order ID: ${order.id}, Original Status: '${originalStatus}'`);

    console.log(`Step 2: Updating to 'Complete'...`);
    const { error } = await supabase
        .from('orders')
        .update({ status: 'Complete' })
        .eq('id', order.id);

    if (error) {
        console.error('FAILED TO UPDATE:', error.message);
        return;
    }

    // Wait a moment for any async triggers
    await new Promise(r => setTimeout(r, 1000));

    const { data: updated } = await supabase
        .from('orders')
        .select('status')
        .eq('id', order.id)
        .single();

    console.log(`Step 3: Verified status in DB: '${updated.status}'`);

    if (updated.status === 'Complete') {
        console.log('SUCCESS: Update persisted correctly.');
    } else if (updated.status === originalStatus) {
        console.log('ISSUE DETECTED: The status was REVERTED to original. Likely a DB trigger.');
    } else {
        console.log(`ISSUE DETECTED: The status is now '${updated.status}', which is neither 'Complete' nor original.`);
    }
}

testUpdate();
