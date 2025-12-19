
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function fixNow() {
    console.log('=== FIXING ALL BLANK ORDERS - PROPER VERSION ===\n');

    // Get all lookup tables
    const [
        { data: customers },
        { data: paperTypes },
        { data: gsms },
        { data: sizes },
        { data: pastings },
        { data: constructions },
        { data: specs },
        { data: addrs },
        { data: effects }
    ] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('paper_types').select('*'),
        supabase.from('gsm').select('*'),
        supabase.from('sizes').select('*'),
        supabase.from('pasting').select('*'),
        supabase.from('constructions').select('*'),
        supabase.from('specifications').select('*'),
        supabase.from('delivery_addresses').select('*'),
        supabase.from('special_effects').select('*')
    ]);

    const maps = {
        customer: Object.fromEntries(customers.map(c => [c.id, c.name])),
        paper: Object.fromEntries(paperTypes.map(p => [p.id, p.name])),
        gsm: Object.fromEntries(gsms.map(g => [g.id, g.name])),
        size: Object.fromEntries(sizes.map(s => [s.id, s.name])),
        pasting: Object.fromEntries(pastings.map(p => [p.id, p.name])),
        construction: Object.fromEntries(constructions.map(c => [c.id, c.name])),
        spec: Object.fromEntries(specs.map(s => [s.id, s.name])),
        addr: Object.fromEntries(addrs.map(a => [a.id, a.name || a.address])),
        effect: Object.fromEntries(effects.map(e => [e.id, e.name]))
    };

    // Get all products
    const { data: products } = await supabase.from('products').select('*');
    console.log(`Loaded ${products.length} products`);

    // Get all orders
    const { data: orders } = await supabase.from('orders').select('*');
    console.log(`Loaded ${orders.length} orders\n`);

    let fixed = 0;

    for (const order of orders) {
        const product = products.find(p => p.id === order.product_id);
        if (!product) continue;

        // Check if ANY snapshot field is blank
        const isBlank = !order.customer_name || !order.paper_type_name || !order.gsm_value;

        if (isBlank) {
            const update = {
                customer_name: maps.customer[product.customer_id] || null,
                paper_type_name: maps.paper[product.paper_type_id] || null,
                gsm_value: maps.gsm[product.gsm_id] || null,
                print_size: maps.size[product.size_id] || null,
                pasting_type: maps.pasting[product.pasting_id] || null,
                construction_type: maps.construction[product.construction_id] || null,
                specification: maps.spec[product.specification_id] || null,
                delivery_address: maps.addr[product.delivery_address_id] || null,
                dimension: product.dimension || null,
                ink: product.ink || null,
                plate_no: product.plate_no || null,
                coating: product.coating || null,
                artwork_code: product.artwork_code || null,
                artwork_pdf: product.artwork_pdf || null,
                artwork_cdr: product.artwork_cdr || null,
                product_image: product.product_image || null,
                folding_dimension: product.folding_dim || null
            };

            // Resolve special effects
            if (product.special_effects) {
                const effectNames = product.special_effects.split('|')
                    .map(id => maps.effect[id])
                    .filter(Boolean)
                    .join(' | ');
                update.special_effects = effectNames || null;
            }

            const { error } = await supabase.from('orders').update(update).eq('id', order.id);
            if (!error) {
                fixed++;
                if (fixed % 50 === 0) console.log(`Fixed ${fixed} orders...`);
            }
        }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Total orders fixed: ${fixed}`);
}

fixNow();
