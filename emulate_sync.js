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
    console.log('--- EMULATING FRONTEND LOGIC ---');

    // 1. Pick a test product (LivaDrine 2.5mg inserts)
    const productId = "5d5e982a-bcca-4b0d-a229-6aada97c1b2f";

    // 2. Fetch current state
    const { data: initialProd } = await supabase.from('products').select('*').eq('id', productId).single();
    if (!initialProd) { console.error('Product not found'); return; }

    const originalCode = initialProd.artwork_code;
    const testCode = originalCode.endsWith(' TEST') ? originalCode.replace(' TEST', '') : originalCode + ' TEST';

    console.log(`Product: ${initialProd.product_name}`);
    console.log(`Code change: "${originalCode}" -> "${testCode}"`);

    // 3. STEP 1: Update Product
    console.log('Step 1: Updating Product...');
    const { error: updateErr } = await supabase
        .from('products')
        .update({ artwork_code: testCode })
        .eq('id', productId);

    if (updateErr) {
        console.error('❌ Product Update Failed:', updateErr);
        return;
    }
    console.log('✅ Product Updated.');

    // 4. STEP 2: Fetch Updated Product (Frontend Logic)
    console.log('Step 2: Fetching Updated Product...');
    const { data: updatedProduct } = await supabase
        .from('products')
        .select('specs, product_name, special_effects, dimension, plate_no, ink, ups, artwork_code, artwork_pdf, artwork_cdr, size_id')
        .eq('id', productId)
        .single();

    console.log('Fetched Product Code:', updatedProduct.artwork_code);

    if (updatedProduct.artwork_code !== testCode) {
        console.error('❌ CRITICAL: Fetched product code does not match the update we just made! Consistency delay?');
        return;
    }

    // 5. STEP 3: Update Orders (Frontend Logic)
    console.log('Step 3: Syncing Orders...');

    const orderUpdates = {
        product_name: updatedProduct.product_name,
        // specs: ... (simplify for test)
        artwork_code: updatedProduct.artwork_code,
        // ... (simplify)
    };

    const { error: syncError, data: syncData } = await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('product_id', productId)
        .select();

    if (syncError) {
        console.error('❌ Sync Failed:', syncError);
    } else {
        console.log(`✅ Sync Success. Updated ${syncData.length} orders.`);
        console.log(`Order Code Now: "${syncData[0]?.artwork_code}"`);
    }

    // 6. Cleanup (Revert)
    console.log('--- REVERTING ---');
    await supabase.from('products').update({ artwork_code: originalCode }).eq('id', productId);
    await supabase.from('orders').update({ artwork_code: originalCode }).eq('product_id', productId);
    console.log('Reverted.');

})();
