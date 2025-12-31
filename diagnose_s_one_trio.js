const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log("DIAGNOSIS: S One Trio 20 Carton\n");

    // 1. Get Special Effects Lookup
    const { data: effects } = await supabase.from('special_effects').select('*');
    console.log("--- Special Effects Lookup Table ---");
    effects.forEach(e => console.log(`${e.id}: ${e.name}`));
    console.log("\n");

    // 2. Find Product
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects, specs')
        .ilike('product_name', '%S One Trio 20 Carton%');

    if (!products || products.length === 0) {
        console.log("Product 'S One Trio 20 Carton' NOT FOUND.");
        return;
    }

    products.forEach(p => {
        console.log(`PRODUCT: ${p.product_name} (ID: ${p.id})`);
        console.log(`  special_effects: "${p.special_effects}"`);
        console.log(`  specs: "${p.specs ? p.specs.substring(0, 50) + '...' : 'null'}"`);
        console.log("");

        // 3. Check Orders for this Product
        supabase.from('orders')
            .select('id, order_id, product_id, special_effects, specs')
            .eq('product_id', p.id)
            .then(({ data: orders }) => {
                console.log(`  ORDERS linked to ${p.id} (${orders.length} found):`);
                orders.forEach(o => {
                    console.log(`    Order ${o.order_id} (ID: ${o.id})`);
                    console.log(`      special_effects: "${o.special_effects}"`);
                });
            });
    });

})();
