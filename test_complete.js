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

    console.log(`Testing update for order ID: ${order.id}, current status: ${order.status}`);

    const { error } = await supabase
        .from('orders')
        .update({ status: 'Complete' })
        .eq('id', order.id);

    if (error) {
        console.error('UPDATE FAILED:', error);
    } else {
        const { data: updated } = await supabase
            .from('orders')
            .select('status')
            .eq('id', order.id)
            .single();
        console.log(`UPDATE SUCCESSFUL. New status in DB: '${updated.status}'`);
    }
}

testUpdate();
