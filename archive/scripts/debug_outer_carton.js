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
    // 1. Search for "LivaDrine 2.5mg outer Cartons"
    const searchName = "LivaDrine 2.5mg outer Cartons";
    console.log(`Searching for: "${searchName}"...`);

    // Get Product
    const { data: products } = await supabase
        .from('products')
        .select(`
            id, 
            product_name, 
            special_effects, 
            specs,
            dimension
        `)
        .ilike('product_name', `%${searchName}%`);

    if (!products || products.length === 0) {
        console.log('❌ Product not found!');
        return;
    }

    const prod = products[0];
    console.log(`\n✅ Found Product [${prod.id}]:`);
    console.log(`Name:    ${prod.product_name}`);
    console.log(`Effects: ${prod.special_effects}`);

    // Get Orders linked to this product
    const { data: orders } = await supabase
        .from('orders')
        .select(`
            id, 
            product_name, 
            special_effects, 
            specs
        `)
        .eq('product_id', prod.id);

    console.log(`\nLinked Orders (${orders.length}):`);
    orders.forEach(o => {
        console.log(`\nOrder [${o.id}]:`);
        console.log(`Name:    ${o.product_name}`);
        console.log(`Effects: ${o.special_effects}`);
        console.log(`Specs:   ${o.specs}`);
    });

    // Also fetch definitions of effects to verify "Gold Foil"
    if (prod.special_effects) {
        const ids = prod.special_effects.split('|').map(x => x.trim()).filter(x => /^\d+$/.test(x));
        if (ids.length > 0) {
            const { data: ef } = await supabase.from('special_effects').select('*').in('id', ids);
            console.log('\nResolved Effects from DB (Product):');
            ef.forEach(e => console.log(`[${e.id}] ${e.name}`));
        } else {
            console.log('\nProduct effects appear to be names already? ', prod.special_effects);
        }
    }

})();
