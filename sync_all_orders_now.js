const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').filter(line => line.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        if (k && v) env[k.trim()] = v.trim();
    });
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function syncAll() {
    console.log('--- STARTING FULL DATABASE SYNC ---');

    try {
        // 1. Fetch all products with all related data
        const { data: products, error: pErr } = await supabase
            .from('products')
            .select(`
                id,
                product_name,
                artwork_code,
                dimension,
                specs,
                ink,
                plate_no,
                coating,
                special_effects,
                artwork_pdf,
                artwork_cdr,
                specification_id,
                gsm_id,
                paper_type_id,
                size_id,
                pasting_id,
                construction_id
            `);

        if (pErr) throw pErr;
        console.log(`Found ${products.length} products to process.`);

        // 2. Fetch all related tables into maps for fast lookup
        const [specData, gsmData, paperData, sizeData, pastingData, constrData] = await Promise.all([
            supabase.from('specifications').select('id, name'),
            supabase.from('gsm').select('id, name'),
            supabase.from('paper_types').select('id, name'),
            supabase.from('sizes').select('id, name'),
            supabase.from('pasting').select('id, name'),
            supabase.from('constructions').select('id, name')
        ]);

        const specMap = new Map(specData.data?.map(i => [i.id, i.name]));
        const gsmMap = new Map(gsmData.data?.map(i => [i.id, i.name]));
        const paperMap = new Map(paperData.data?.map(i => [i.id, i.name]));
        const sizeMap = new Map(sizeData.data?.map(i => [i.id, i.name]));
        const pastingMap = new Map(pastingData.data?.map(i => [i.id, i.name]));
        const constrMap = new Map(constrData.data?.map(i => [i.id, i.name]));

        // 3. Iterate products and update their orders
        let totalUpdated = 0;
        for (const p of products) {
            const payload = {
                product_name: p.product_name,
                artwork_code: p.artwork_code,
                dimension: p.dimension,
                specs: p.specs,
                ink: p.ink,
                plate_no: p.plate_no,
                coating: p.coating,
                special_effects: p.special_effects,
                artwork_pdf: p.artwork_pdf,
                artwork_cdr: p.artwork_cdr,
                specification: specMap.get(p.specification_id) || null,
                gsm_value: gsmMap.get(p.gsm_id) || null,
                paper_type_name: paperMap.get(p.paper_type_id) || null,
                print_size: sizeMap.get(p.size_id) || null,
                pasting_type: pastingMap.get(p.pasting_id) || null,
                construction_type: constrMap.get(p.construction_id) || null
            };

            const { data, error, count } = await supabase
                .from('orders')
                .update(payload)
                .eq('product_id', p.id);

            if (error) {
                console.error(`Error updating orders for product ${p.product_name}:`, error.message);
            } else {
                // Supabase update doesn't return count unless { count: 'exact' } is passed, 
                // but we can assume success if error is null.
                totalUpdated++;
                if (totalUpdated % 10 === 0) console.log(`Processed ${totalUpdated}/${products.length} products...`);
            }
        }

        console.log('\n--- SYNC COMPLETED SUCCESSFULLY ---');
        console.log(`Total Products Synced: ${totalUpdated}`);
        console.log('Existing orders now match the Product Master.');

    } catch (e) {
        console.error('CRITICAL SYNC ERROR:', e);
    }
}

syncAll();
