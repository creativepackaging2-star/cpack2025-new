
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

async function checkColumns() {
    console.log('=== CHECKING PRODUCT SKU 598 ===');
    const { data: product } = await supabase.from('products')
        .select('*')
        .eq('sku', '598')
        .single();

    console.log('\nPRODUCT COLUMNS:');
    console.log('plate_no:', product.plate_no);
    console.log('construction_id:', product.construction_id);
    console.log('specification_id:', product.specification_id);
    console.log('specs:', product.specs);
    console.log('pasting_id:', product.pasting_id);
    console.log('coating:', product.coating);

    console.log('\n=== CHECKING ORDER FOR SKU 598 ===');
    const { data: order } = await supabase.from('orders')
        .select('*')
        .eq('product_id', product.id)
        .single();

    console.log('\nORDER COLUMNS:');
    console.log('plate_no:', order.plate_no);
    console.log('construction_type:', order.construction_type);
    console.log('specification:', order.specification);
    console.log('specs:', order.specs || 'COLUMN DOES NOT EXIST');
    console.log('pasting_type:', order.pasting_type);
    console.log('coating:', order.coating);

    console.log('\n=== CHECKING ORDERS TABLE SCHEMA ===');
    const { data: sample } = await supabase.from('orders').select('*').limit(1);
    const orderColumns = Object.keys(sample[0]);

    const missingColumns = [];
    if (!orderColumns.includes('specs')) missingColumns.push('specs');
    if (!orderColumns.includes('plate_no')) missingColumns.push('plate_no');
    if (!orderColumns.includes('construction_type')) missingColumns.push('construction_type');
    if (!orderColumns.includes('specification')) missingColumns.push('specification');

    if (missingColumns.length > 0) {
        console.log('\n⚠️  MISSING COLUMNS:', missingColumns.join(', '));
    } else {
        console.log('\n✓ All columns exist');
    }
}

checkColumns();
