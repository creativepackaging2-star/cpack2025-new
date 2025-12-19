
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Environment Variables from .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            process.env[key.trim()] = valParts.join('=').trim();
        }
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function repair() {
    console.log('--- STARTING DATABASE REPAIR (JS Mapping Version) ---');

    console.log('Fetching lookup tables...');
    const [
        { data: seData },
        { data: custData },
        { data: ptData },
        { data: gsmData },
        { data: sizeData },
        { data: pastData },
        { data: consData },
        { data: specData },
        { data: addrData }
    ] = await Promise.all([
        supabase.from('special_effects').select('id, name'),
        supabase.from('customers').select('id, name'),
        supabase.from('paper_types').select('id, name'),
        supabase.from('gsm').select('id, name'),
        supabase.from('sizes').select('id, name'),
        supabase.from('pasting').select('id, name'),
        supabase.from('constructions').select('id, name'),
        supabase.from('specifications').select('id, name'),
        supabase.from('delivery_addresses').select('id, name')
    ]);

    const createMap = (data) => {
        const map = {};
        if (data) data.forEach(item => map[item.id] = item.name);
        return map;
    };

    const seMap = createMap(seData);
    const custMap = createMap(custData);
    const ptMap = createMap(ptData);
    const gsmMap = createMap(gsmData);
    const sizeMap = createMap(sizeData);
    const pastMap = createMap(pastData);
    const consMap = createMap(consData);
    const specMap = createMap(specData);
    const addrMap = createMap(addrData);

    console.log('Fetching products...');
    const { data: products, error: pError } = await supabase.from('products').select('*');
    if (pError) { console.error(pError); return; }

    const productMap = {};
    products.forEach(p => {
        let resolvedEffects = '';
        if (p.special_effects) {
            resolvedEffects = p.special_effects.split('|')
                .map(id => seMap[id] || id)
                .join(' | ');
        }

        productMap[p.id] = {
            customer_name: custMap[p.customer_id],
            paper_type_name: ptMap[p.paper_type_id],
            gsm_value: gsmMap[p.gsm_id],
            print_size: sizeMap[p.size_id],
            pasting_type: pastMap[p.pasting_id],
            construction_type: consMap[p.construction_id],
            specification: specMap[p.specification_id],
            delivery_address: addrMap[p.delivery_address_id],
            special_effects: resolvedEffects,
            dimension: p.dimension,
            ink: p.ink,
            plate_no: p.plate_no,
            coating: p.coating,
            artwork_code: p.artwork_code,
            artwork_pdf: p.artwork_pdf,
            artwork_cdr: p.artwork_cdr,
            product_image: p.product_image,
            folding_dimension: p.folding_dim
        };
    });

    console.log(`Loaded ${products.length} products.`);

    console.log('Fetching orders...');
    const { data: orders, error: oError } = await supabase.from('orders').select('*');
    if (oError) { console.error(oError); return; }

    console.log(`Analyzing ${orders.length} orders...`);

    let updatedCount = 0;
    for (const order of orders) {
        const prodData = productMap[order.product_id];
        if (!prodData) continue;

        const updatePayload = {};
        const fieldsToSync = [
            'customer_name', 'paper_type_name', 'gsm_value', 'print_size',
            'dimension', 'ink', 'plate_no', 'coating', 'special_effects',
            'pasting_type', 'construction_type', 'specification', 'artwork_code',
            'delivery_address', 'artwork_pdf', 'artwork_cdr', 'product_image', 'folding_dimension'
        ];

        let hasBlank = false;
        fieldsToSync.forEach(field => {
            const currentVal = order[field];
            const newVal = prodData[field];

            // Consider "null" string or actual null/empty as blank
            if ((currentVal === null || currentVal === '' || String(currentVal).toLowerCase() === 'null') && newVal) {
                updatePayload[field] = newVal;
                hasBlank = true;
            }
        });

        if (hasBlank) {
            const { error: uError } = await supabase.from('orders').update(updatePayload).eq('id', order.id);
            if (uError) {
                console.error(`Error updating order ${order.id}: ${uError.message}`);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\n--- REPAIR COMPLETE for "orders" ---`);
    console.log(`Total Orders Processed: ${orders.length}`);
    console.log(`Total Orders Updated: ${updatedCount}`);

    // D. Repeat for orders_enhanced
    console.log('\n--- Analyzing orders_enhanced ---');
    const { data: enhOrders, error: eError } = await supabase.from('orders_enhanced').select('*');
    if (eError) { console.error(eError); return; }

    let enhUpdatedCount = 0;
    for (const order of enhOrders) {
        const prodData = productMap[order.product_id];
        if (!prodData) continue;

        const updatePayload = {};
        const fieldsToSync = [
            'customer_name', 'paper_type_name', 'gsm_value', 'print_size',
            'dimension', 'ink', 'plate_no', 'coating', 'special_effects',
            'pasting_type', 'construction_type', 'specification', 'artwork_code',
            'delivery_address', 'artwork_pdf', 'artwork_cdr', 'product_image', 'folding_dimension'
        ];

        let hasBlank = false;
        fieldsToSync.forEach(field => {
            const currentVal = order[field];
            const newVal = prodData[field];
            if ((currentVal === null || currentVal === '' || String(currentVal).toLowerCase() === 'null') && newVal) {
                updatePayload[field] = newVal;
                hasBlank = true;
            }
        });

        if (hasBlank) {
            const { error: uError } = await supabase.from('orders_enhanced').update(updatePayload).eq('id', order.id);
            if (!uError) enhUpdatedCount++;
        }
    }

    console.log(`--- REPAIR COMPLETE for "orders_enhanced" ---`);
    console.log(`Total Updated: ${enhUpdatedCount}`);
}

repair();
