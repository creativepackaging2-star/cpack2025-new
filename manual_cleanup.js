const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function cleanup() {
    console.log('--- CLEANUP START ---');

    let url = '';
    let key = '';

    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            if (line.includes('NEXT_PUBLIC_SUPABASE_URL')) url = line.split('=')[1].trim().replace(/['"﻿]/g, '');
            if (line.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) key = line.split('=')[1].trim().replace(/['"]/g, '');
        }
    } catch (e) {
        console.error('Env Read Error:', e);
        return;
    }

    if (!url || !key) {
        console.error('Missing URL or Key');
        return;
    }

    const supabase = createClient(url, key);

    const orderIDs = [1422, 1423, 1424];
    const productID = 'e6a2552c-fba7-4227-bb9c-e02b51e271f0';

    const { data: oData, error: oErr } = await supabase.from('orders').delete().in('id', orderIDs).select();
    console.log('Orders deleted:', oData?.length || 0);
    if (oErr) console.error('Order Error:', oErr);

    const { data: pData, error: pErr } = await supabase.from('products').delete().eq('id', productID).select();
    console.log('Product deleted:', pData?.length || 0);
    if (pErr) console.error('Product Error:', pErr);

    console.log('--- CLEANUP END ---');
}

cleanup().catch(console.error);
