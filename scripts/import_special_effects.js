const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Environment Variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.trim();
        }
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function importEffects() {
    const csvPath = path.resolve(__dirname, '../special_effects_import.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('Error: special_effects_import.csv not found in project root.');
        console.log('Please create this file with columns: sku, effects');
        console.log('Example content:');
        console.log('sku,effects');
        console.log('19,Gold Foil|Embossing');
        process.exit(1);
    }

    console.log('--- Starting Import ---');

    // 2. Fetch Lookups
    console.log('Fetching existing special effects...');
    let { data: existingEffects, error: effError } = await supabase.from('special_effects').select('*');
    if (effError) throw effError;

    const effectMap = {}; // Name -> ID
    existingEffects.forEach(e => effectMap[e.name.toLowerCase().trim()] = e.id);

    // 3. Helper to get or create effect ID
    async function getEffectId(name) {
        const cleanName = name.trim();
        const key = cleanName.toLowerCase();

        if (effectMap[key]) return effectMap[key];

        console.log(`Creating new effect: "${cleanName}"`);
        const { data, error } = await supabase.from('special_effects').insert([{ name: cleanName }]).select().single();
        if (error) {
            console.error(`Failed to create effect ${cleanName}:`, error.message);
            return null;
        }
        effectMap[key] = data.id;
        return data.id;
    }

    // 4. Fetch Products (Map SKU to ID)
    console.log('Fetching products...');
    const { data: products, error: prodError } = await supabase.from('products').select('id, sku');
    if (prodError) throw prodError;

    const productMap = {}; // SKU -> UUID
    products.forEach(p => {
        if (p.sku) productMap[p.sku.trim()] = p.id;
    });

    // 5. Process CSV
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    let successCount = 0;

    // Skip header if present
    const startIdx = lines[0].toLowerCase().includes('sku') ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parse (assuming no commas in values, or handle quotes if needed)
        // Adjust split char based on your CSV format (comma or pipe)
        const parts = line.split(',');
        if (parts.length < 2) continue;

        const sku = parts[0].trim();
        const rawEffects = parts[1].trim(); // e.g. "Gold Foil | Embossing" or "Gold Foil"

        if (!productMap[sku]) {
            console.warn(`Skipping SKU "${sku}": Product not found.`);
            continue;
        }

        const effectNames = rawEffects.split('|'); // Assuming pipe separator in CSV for multiple effects
        const effectIds = [];

        for (const name of effectNames) {
            if (!name.trim()) continue;
            const id = await getEffectId(name);
            if (id) effectIds.push(id);
        }

        if (effectIds.length > 0) {
            const effectString = effectIds.join('|');
            const productId = productMap[sku];

            const { error } = await supabase
                .from('products')
                .update({ special_effects: effectString })
                .eq('id', productId);

            if (error) {
                console.error(`Failed to update SKU ${sku}:`, error.message);
            } else {
                console.log(`Updated SKU ${sku} with effects: ${effectString} (${rawEffects})`);
                successCount++;
            }
        }
    }

    console.log(`--- Import Complete. Updated ${successCount} products. ---`);
}

importEffects().catch(console.error);
