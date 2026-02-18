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

        log('--- CHECKING TABLE SCHEMA VIA INSPECTION ---');

        // 1. Inspect Orders Schema by fetching one row
        const { data: orderSample, error: orderSampleError } = await supabase
            .from('orders')
            .select('*')
            .limit(1);

        if (orderSampleError) {
            log('Error fetching order sample: ' + JSON.stringify(orderSampleError));
        } else if (orderSample && orderSample.length > 0) {
            log('Orders Table Columns: ' + Object.keys(orderSample[0]).join(', '));
        } else {
            log('Orders table is empty or error/no permissions.');
        }

        // 1b. Inspect Products Schema query
        const { data: prodSample, error: prodSampleError } = await supabase
            .from('products')
            .select('*')
            .limit(1);
        if (prodSample && prodSample.length > 0) {
            log('Products Table Columns: ' + Object.keys(prodSample[0]).join(', '));
        }

        // 1. Create a dummy product
        const dummyId = '00000000-0000-0000-0000-000000000000';

        // Clean up first
        await supabase.from('orders').delete().eq('product_id', dummyId);
        await supabase.from('products').delete().eq('id', dummyId);

        log('Creating Test Product...');
        const { data: prod, error: prodError } = await supabase
            .from('products')
            .insert({
                id: dummyId,
                product_name: 'FORMULA_TEST_PRODUCT',
                // Using minimal fields ref'd in schema log
                dimension: '100x50x50',
                special_effects: JSON.stringify(['MetPet', 'Embossing']),
                status: 'Draft'
                // Omitting category, gsm, paper_type as they are probably IDs and might cause FK error if I guess wrong.
                // If they are required, insertion will fail, and we will know.
            })
            .select()
            .single();

        if (prodError) {
            log('Failed to create test product: ' + JSON.stringify(prodError));
            return;
        }
        log('Product Created: ' + prod.product_name);

        // Check if specs/specs_special_EF was generated
        log('Generated specs check: ' + JSON.stringify(prod.specs));

        // 2. Create a linked order
        log('Creating Linked Order...');
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                product_id: dummyId,
                product_name: 'FORMULA_TEST_PRODUCT_SNAPSHOT',
                quantity: 1000,
                status: 'Pending',
                order_date: new Date().toISOString()
            })
            .select()
            .single();

        if (orderError) {
            log('Failed to create test order: ' + JSON.stringify(orderError));
        } else {
            log('Order Created: ' + order.id);
        }

        // 3. Update the product and check if Order updates (Trigger Check)
        log('Updating Product to trigger sync...');
        const { error: updateError } = await supabase
            .from('products')
            .update({
                product_name: 'FORMULA_TEST_PRODUCT_UPDATED',
                special_effects: JSON.stringify(['Spot UV', 'Foil']),
                coating: 'Gloss Varnish',
                ups: 2,
                folding_dim: '50x50x100' // Should map to folding_dimension
            })
            .eq('id', dummyId);

        if (updateError) {
            log('Update failed: ' + JSON.stringify(updateError));
        } else {
            log('Update successful. Waiting for trigger...');
        }

        // Wait a moment for trigger
        await new Promise(r => setTimeout(r, 2000));

        // 4. Verify Order Sync
        const { data: updatedOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .single();

        log('--- VERIFICATION RESULTS ---');
        if (updatedOrder) {
            log('Order Product Name: ' + updatedOrder.product_name);
            log('Name Sync Working: ' + (updatedOrder.product_name === 'FORMULA_TEST_PRODUCT_UPDATED' ? 'YES' : 'NO'));

            log('Order Coating: ' + updatedOrder.coating);
            log('Coating Sync Working: ' + (updatedOrder.coating === 'Gloss Varnish' ? 'YES' : 'NO'));

            log('Order UPS: ' + updatedOrder.ups);
            log('UPS Sync Working: ' + (updatedOrder.ups === 2 ? 'YES' : 'NO'));

            log('Order Folding Dimension: ' + updatedOrder.folding_dimension);
            log('Folding Dim Map Working: ' + (updatedOrder.folding_dimension === '50x50x100' ? 'YES' : 'NO'));
        } else {
            log('Could not fetch updated order');
        }

        // Clean up
        log('Cleaning up...');
        await supabase.from('orders').delete().eq('product_id', dummyId);
        await supabase.from('products').delete().eq('id', dummyId);

    } catch (err) {
        log('CRITICAL SCRIPT ERROR: ' + err.message);
        console.error(err);
    }
})();
