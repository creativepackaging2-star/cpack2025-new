const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
    console.log('=== FIXING S ONE TRIO SPECIAL EFFECTS ===\n');

    // 1. Get all special effects
    const { data: effects } = await supabase.from('special_effects').select('*').order('id');
    console.log('Available Special Effects:');
    effects.forEach(e => console.log(`  ${e.id}: ${e.name}`));
    console.log('');

    // Find UV and Emboss IDs
    const uvEffect = effects.find(e => e.name.toLowerCase().includes('uv') && !e.name.toLowerCase().includes('emboss'));
    const embossEffect = effects.find(e => e.name.toLowerCase() === 'embossing' || e.name.toLowerCase() === 'emboss');

    console.log('Correct effects for S One Trio:');
    console.log(`  UV: ${uvEffect ? `${uvEffect.id} - ${uvEffect.name}` : 'NOT FOUND'}`);
    console.log(`  Emboss: ${embossEffect ? `${embossEffect.id} - ${embossEffect.name}` : 'NOT FOUND'}`);
    console.log('');

    if (!uvEffect || !embossEffect) {
        console.log('ERROR: Could not find required special effects!');
        return;
    }

    // 2. Find S One Trio products
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, special_effects')
        .ilike('product_name', '%S One Trio 20 Carton%');

    if (!products || products.length === 0) {
        console.log('Product not found!');
        return;
    }

    const p = products[0];
    console.log(`Found: ${p.product_name}`);
    console.log(`  Current: "${p.special_effects}"`);

    // Correct value should be pipe-separated IDs
    const correctIds = `${uvEffect.id}|${embossEffect.id}`;
    const correctNames = `${uvEffect.name} | ${embossEffect.name}`;

    console.log(`  Should be IDs: "${correctIds}"`);
    console.log(`  Should be Names: "${correctNames}"`);
    console.log('');

    // 3. Update Product
    console.log('Updating product...');
    const { error: pErr } = await supabase
        .from('products')
        .update({ special_effects: correctIds })
        .eq('id', p.id);

    if (pErr) {
        console.error('Product update failed:', pErr);
        return;
    }
    console.log('✓ Product updated');

    // 4. Update Orders
    console.log('Updating orders...');
    const { error: oErr } = await supabase
        .from('orders')
        .update({ special_effects: correctNames })
        .eq('product_id', p.id);

    if (oErr) {
        console.error('Orders update failed:', oErr);
    } else {
        console.log('✓ Orders updated');
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log(`S One Trio 20 Carton now shows: ${correctNames}`);
})();
